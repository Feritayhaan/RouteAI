import { NextRequest, NextResponse } from "next/server";
import { analyzeIntent } from "@/lib/intent";
import { generateWorkflow, formatWorkflowForApi } from "@/lib/workflow";
import { searchTools } from "@/lib/vectorService";
import { getTools, generateExplanation, getLocalized, resolveLocale, Tool } from "@/lib/toolsService";
import { getPricingModel, isPaidOnly, matchesPricingFilter } from "@/lib/pricing";
import { rankTools } from "@/lib/ranking";
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
          workflow: formatWorkflowForApi(workflow, resolveLocale(intent.constraints?.language)),
        });
      }
      // workflow null döndüyse simple recommendation'a düş
    }

    // ============================================================
    // 3. VEKTÖR ARAMASI + EŞLEŞTİRME
    // ============================================================
    const allTools = await getTools();

    const searchScores = new Map<string, number>();
    const candidates: Tool[] = [];
    for (const result of searchResults) {
      const tool = allTools.find(t => t.name === result.metadata.name);
      // deprecated kayıtlar arama sonucundan da elenmeli. Kategori fallback'i
      // (categoryPool) bunu zaten yapıyordu ama arama yolu yapmıyordu: karantina
      // triyajıyla emekliye ayrılan araçlar buradan sızıyordu.
      if (!tool || tool.deprecated) continue;
      candidates.push(tool);
      searchScores.set(tool.name, result.score);
    }

    // ============================================================
    // Filtreler tek yerde tanımlı: hem arama dalında hem kategori
    // fallback'inde AYNI kurallar çalışsın diye (eskiden kopyalanmıştı).
    // ============================================================

    // UI'dan gelen filtre + sorgunun kendi fiyat kısıtı.
    // relaxIntent=true iken sorgu kısıtı düşer, UI filtresi ASLA düşmez:
    // kullanıcının açıkça tıkladığı filtreyi gevşetme hakkımız yok.
    const filterByPricing = (list: Tool[], relaxIntent: boolean): Tool[] => {
      let out = list;

      // "Ücretli" artık freemium'u KAPSAMIYOR (bkz. lib/pricing.ts)
      if (pricingFilter && pricingFilter !== 'all') {
        out = out.filter(t => matchesPricingFilter(t.pricing, pricingFilter));
      }

      if (!relaxIntent) {
        // Kullanıcı "ücretsiz" dediyse freemium yeterli değil: ücretsiz
        // sanıp ödeme duvarına çarpmak, az seçenek görmekten kötü.
        if (intent.constraints?.pricing === 'free') {
          out = out.filter(t => getPricingModel(t.pricing) === 'free');
        } else if (intent.constraints?.pricing === 'paid') {
          out = out.filter(t => isPaidOnly(t.pricing));
        }
      }

      return out;
    };

    // outputTypes çapraz kontrolü: kategoriyle uyumlu çıktı veren araçları tut.
    // Örn: "video üret" => sadece outputTypes 'video' olan araçlar kalsın.
    const filterByOutputs = (list: Tool[]): Tool[] => {
      const expected = categoryOutputMap[intent.primaryCategory];
      if (!expected) return list;
      return list.filter(t =>
        !t.outputTypes || // outputTypes tanımlı değilse geç (legacy araç)
        t.outputTypes.some(o => expected.includes(o))
      );
    };

    const categoryPool = (): Tool[] =>
      allTools.filter(t => t.category === intent.primaryCategory && !t.deprecated);

    // ============================================================
    // Aday seçimi: aramadan başla, boşalırsa sırayla gevşet.
    // Kısıtı gevşetmek sessizce olmaz — meta'da relaxedConstraint ile bildirilir.
    // ============================================================
    let relaxedConstraint: 'pricing' | null = null;
    let recommendedTools = filterByOutputs(filterByPricing(candidates, false));

    if (recommendedTools.length === 0) {
      // Arama ya boş döndü ya da bulduğu araçlar kategori/fiyat kısıtına
      // uymuyor. Eskiden bu durumda kısıt SESSİZCE yok sayılıp kategori dışı
      // araç ana öneri oluyordu ("YouTube altyazı" -> OpusClip, video aracı).
      recommendedTools = filterByOutputs(filterByPricing(categoryPool(), false));
    }

    if (recommendedTools.length === 0) {
      relaxedConstraint = 'pricing';
      recommendedTools = filterByOutputs(filterByPricing(candidates, true));
      if (recommendedTools.length === 0) {
        recommendedTools = filterByOutputs(filterByPricing(categoryPool(), true));
      }
    }

    if (recommendedTools.length === 0) {
      return NextResponse.json({ error: "Bu istek için uygun araç bulunamadı" });
    }

    // Tek sıralama yolu: arama skoru > karantina cezası > strength > lastUpdated
    recommendedTools = rankTools(recommendedTools, { searchScores });

    // ============================================================
    // GÖREV 5: Streaming NDJSON — ilk byte hızı maksimize
    // Chunk 1: main → hemen flush (kullanıcı anında görür)
    // Chunk 2: alternatives → arkasından
    // Chunk 3: meta/debug → en sonda
    // ============================================================
    const [main, ...rest] = recommendedTools;

    // Alternatifler ana aracın ya da sorgunun kategorisiyle ilgili olmalı.
    // Eskiden hiçbir filtreden geçmiyordu: "ses klonlama podcast" sorgusunda
    // 1. alternatif GitHub Copilot (kod) çıkıyordu. 3'ten az kalırsa az
    // gösteriyoruz — alakasız araçla doldurmak boşluktan kötü.
    const allowedCategories = new Set<string>([
      main.category,
      intent.primaryCategory,
      ...(intent.secondaryCategories ?? []),
    ]);
    const alternatives = rest
      .filter(t =>
        allowedCategories.has(t.category) ||
        t.secondaryCategories?.some(c => allowedCategories.has(c))
      )
      .slice(0, 3);

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
