import { NextRequest, NextResponse } from "next/server";
import { analyzeIntent } from "@/lib/intent";
import { generateWorkflow, formatWorkflowForApi } from "@/lib/workflow";
import { searchTools } from "@/lib/vectorService";
import { getTools, generateExplanation, getLocalized, resolveLocale } from "@/lib/toolsService";
import { selectV1Tools } from "@/lib/recommendV1";
import { recommendRequestSchema } from "@/lib/validations/recommend";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

// ============================================================
// GÖREV 3: Edge Runtime — ~200ms cold start tasarrufu
// ============================================================
export const runtime = 'edge';
export const preferredRegion = 'fra1'; // Avrupa (Türkiye yakın)

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

    // Kullanıcı metni loglanmaz; teşhis için uzunluğu yeter.
    console.log('[API] İstek analiz ediliyor, uzunluk:', prompt.length);

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
          workflow: formatWorkflowForApi(workflow, resolveLocale(intent.constraints?.language)),
        });
      }
      // workflow null döndüyse simple recommendation'a düş
    }

    // ============================================================
    // 3. VEKTÖR ARAMASI + EŞLEŞTİRME
    // Aday seçimi, filtreler ve sıralama lib/recommendV1.ts'te: testler ve
    // scripts/run-queries.mjs de aynı kodu çalıştırıyor.
    // ============================================================
    const allTools = await getTools();
    const selection = selectV1Tools({ intent, searchResults, allTools, pricingFilter });

    if (!selection) {
      return NextResponse.json({ error: "Bu istek için uygun araç bulunamadı" });
    }

    // ============================================================
    // GÖREV 5: Streaming NDJSON — ilk byte hızı maksimize
    // Chunk 1: main → hemen flush (kullanıcı anında görür)
    // Chunk 2: alternatives → arkasından
    // Chunk 3: meta/debug → en sonda
    // ============================================================
    const { main, alternatives, relaxedConstraint } = selection;

    const locale = resolveLocale(intent.constraints?.language);
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
              description: getLocalized(main, 'description', locale),
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
            alternatives: alternatives.map((t) => ({
              toolName: t.name,
              description: getLocalized(t, 'description', locale),
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
          // Kısıt gevşetildiyse sessiz kalma: kullanıcı "ücretsiz" isteyip
          // ücretli sonuç görüyorsa bunu bilmeli.
          if (relaxedConstraint) {
            metaChunk.relaxedConstraint = relaxedConstraint;
          }
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
