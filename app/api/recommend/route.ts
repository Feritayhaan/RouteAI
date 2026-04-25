import { NextRequest, NextResponse } from "next/server";
import { analyzeIntent } from "@/lib/intent";
import { generateWorkflow, formatWorkflowForApi } from "@/lib/workflow";
import { searchTools } from "@/lib/vectorService";
import { getTools, generateExplanation, Tool } from "@/lib/toolsService";
import { recommendRequestSchema } from "@/lib/validations/recommend";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

// ============================================================
// GÖREV 3: Edge Runtime — ~200ms cold start tasarrufu
// ============================================================
export const runtime = 'edge';
export const preferredRegion = 'fra1'; // Avrupa (Türkiye yakın)

// ============================================================
// Kategori → beklenen outputTypes haritası
// Vector search yanlış kategori araç döndürürse filtrelemek için.
// ============================================================
const categoryOutputMap: Record<string, string[]> = {
  video: ['video'],
  gorsel: ['image'],
  ses: ['audio'],
  kod: ['code', 'text'],
  metin: ['text'],
  arastirma: ['text'],
  veri: ['text', 'image'],
};

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - check BEFORE any expensive operations
    const ip = getClientIp(req);
    const rateLimitResult = await checkRateLimit(ip, "recommend");

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.reset },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const body = await req.json();

    // Validate request body with Zod
    const validationResult = recommendRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path.join(".");
        details[field] = err.message;
      });

      return NextResponse.json(
        {
          error: "Validation failed",
          details,
        },
        { status: 400 }
      );
    }

    const { prompt, pricingFilter } = validationResult.data;

    console.log('[API] İstek analiz ediliyor:', prompt);

    // 1. Niyet Analizi ve Vektör Aramasını PARALEL çalıştır
    const [intentResult, searchResults] = await Promise.all([
      analyzeIntent(prompt),
      searchTools(prompt, 8),
    ]);

    // Eğer hata varsa erken dön (searchResults kullanılmaz)
    if ('code' in intentResult) {
      if (intentResult.code === 'LOW_CONFIDENCE') {
        return NextResponse.json({
          error: intentResult.message,
          suggestions: intentResult.suggestions,
          isLowConfidence: true,
        }, { status: 200 });
      }

      return NextResponse.json({
        error: intentResult.message,
        suggestions: intentResult.suggestions,
      }, { status: 400 });
    }

    const intent = intentResult;

    // ============================================================
    // GÖREV 4: Workflow kontrolü — LAZY, sadece multi-step ise çağrılır
    // ============================================================
    if (intent.complexity === 'multi-step') {
      // generateWorkflow sadece burada çağrılır, simple sorgularda hiç çalışmaz
      const workflow = await generateWorkflow(intent, prompt);
      if (workflow) {
        return NextResponse.json({
          type: 'workflow',
          category: intent.primaryCategory,
          workflow: formatWorkflowForApi(workflow),
        });
      }
      // workflow null döndüyse simple recommendation'a düş
    }

    // ============================================================
    // 3. VEKTÖR ARAMASI + EŞLEŞTİRME
    // ============================================================
    const allTools = await getTools();
    let recommendedTools: Tool[] = [];

    for (const result of searchResults) {
      const tool = allTools.find(t => t.name === result.metadata.name);
      if (tool) recommendedTools.push(tool);
    }

    // Fiyat filtresi
    if (pricingFilter && pricingFilter !== 'all') {
      recommendedTools = recommendedTools.filter(t => {
        if (pricingFilter === 'free') return t.pricing.free || t.pricing.freemium;
        if (pricingFilter === 'paid') return t.pricing.paidOnly || t.pricing.freemium;
        return true;
      });
    }

    // ============================================================
    // outputTypes çapraz kontrolü: kategoriyle uyumlu çıktı veren araçları tut.
    // Örn: "video üret" => sadece outputTypes 'video' olan araçlar kalsın
    // (Gamma AI gibi sunum araçları elenir).
    // ============================================================
    const expectedOutputs = categoryOutputMap[intent.primaryCategory];
    if (expectedOutputs && recommendedTools.length > 0) {
      const filtered = recommendedTools.filter(t =>
        !t.outputTypes || // outputTypes tanımlı değilse geç (legacy araç)
        t.outputTypes.some(o => expectedOutputs.includes(o))
      );
      if (filtered.length > 0) {
        recommendedTools = filtered;
      }
    }

    // Fallback: kategori bazlı + outputTypes güvenliği
    if (recommendedTools.length === 0) {
      recommendedTools = allTools.filter(t => {
        if (t.category !== intent.primaryCategory) return false;
        if (t.deprecated) return false;
        const expected = categoryOutputMap[intent.primaryCategory];
        if (!expected || !t.outputTypes) return true;
        return t.outputTypes.some(o => expected.includes(o));
      });

      // Pricing filtre fallback'e de uygulansın
      if (pricingFilter && pricingFilter !== 'all') {
        recommendedTools = recommendedTools.filter(t => {
          if (pricingFilter === 'free') return t.pricing.free || t.pricing.freemium;
          if (pricingFilter === 'paid') return t.pricing.paidOnly || t.pricing.freemium;
          return true;
        });
      }

      // Strength'e göre sırala (vector skor yok)
      recommendedTools.sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
    }

    if (recommendedTools.length === 0) {
      return NextResponse.json({ error: "Bu istek için uygun araç bulunamadı" });
    }

    // ============================================================
    // GÖREV 5: Streaming NDJSON — ilk byte hızı maksimize
    // Chunk 1: main → hemen flush (kullanıcı anında görür)
    // Chunk 2: alternatives → arkasından
    // Chunk 3: meta/debug → en sonda
    // ============================================================
    const [main, ...rest] = recommendedTools;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        try {
          // CHUNK 1: Ana öneri — HEMEN gönder (ilk byte)
          const explanation = generateExplanation(intent, main);
          const mainChunk = {
            chunk: 'main',
            type: 'simple',
            category: intent.primaryCategory,
            main: {
              toolName: main.name,
              description: main.description,
              url: main.url,
              pricing: main.pricing,
              strength: main.strength,
              why: explanation,
            },
          };
          controller.enqueue(encoder.encode(JSON.stringify(mainChunk) + '\n'));

          // CHUNK 2: Alternatifler
          const alternativesChunk = {
            chunk: 'alternatives',
            alternatives: rest.slice(0, 3).map((t) => ({
              toolName: t.name,
              description: t.description,
              url: t.url,
              pricing: t.pricing,
              strength: t.strength,
            })),
          };
          controller.enqueue(encoder.encode(JSON.stringify(alternativesChunk) + '\n'));

          // CHUNK 3: Meta bilgisi (kategori + debug)
          const metaChunk: Record<string, unknown> = {
            chunk: 'meta',
            category: intent.primaryCategory,
            confidence: intent.confidence,
          };
          if (process.env.NODE_ENV !== 'production') {
            metaChunk._debug = {
              source: 'vector-search',
              matchScore: searchResults[0]?.score,
              tier: intent.reasoning?.includes('Kademe 1') ? 'rule-based' : 'llm',
            };
          }
          controller.enqueue(encoder.encode(JSON.stringify(metaChunk) + '\n'));

          controller.close();
        } catch (streamError) {
          console.error("Stream generation error:", streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error("API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
