import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { analyzeIntent } from "@/lib/intent";
import { generateWorkflow, formatWorkflowForApi } from "@/lib/workflow";
import { searchTools } from "@/lib/vectorService"; // Az önce oluşturduğumuz servis
import { getTools, generateExplanation, Tool } from "@/lib/toolsService";
import { recommendRequestSchema } from "@/lib/validations/recommend";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

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

    // 1. Niyet Analizi (Hala kullanıyoruz çünkü kullanıcının "kod" mu istediğini anlamalıyız)
    const intentResult = await analyzeIntent(prompt);

    // Eğer kullanıcı kod istediyse veya hata varsa
    if ('code' in intentResult) {
      // LOW_CONFIDENCE durumunda daha yardımcı bir mesaj göster
      if (intentResult.code === 'LOW_CONFIDENCE') {
        return NextResponse.json({
          error: intentResult.message,
          suggestions: intentResult.suggestions,
          isLowConfidence: true, // Frontend'de farklı gösterebilmek için
        }, { status: 200 }); // 200 döndür ki frontend hata olarak algılamasın
      }

      // Diğer hatalar için normal error response
      return NextResponse.json({
        error: intentResult.message,
        suggestions: intentResult.suggestions,
      }, { status: 400 });
    }

    const intent = intentResult;

    // 2. Workflow (Çok adımlı işler) Kontrolü
    if (intent.complexity === 'multi-step') {
      const workflow = await generateWorkflow(intent, prompt);
      if (workflow) {
        return NextResponse.json({
          type: 'workflow',
          category: intent.primaryCategory,
          workflow: formatWorkflowForApi(workflow),
        });
      }
    }

    // ============================================================
    // 3. VEKTÖR ARAMASI (YENİ ZEKA)
    // ============================================================
    console.log('[API] Vektör veritabanında aranıyor...');

    // Kullanıcının ne dediğini anlayan vektör araması yap
    const searchResults = await searchTools(prompt, 8); // En alakalı 8 adayı getir

    // Vektörden gelen ID'leri, elimizdeki detaylı "Tool" verisiyle eşleştir
    const allTools = await getTools();
    let recommendedTools: Tool[] = [];

    // Sonuçları puana (score) göre sıralı ekle
    searchResults.forEach(result => {
      const tool = allTools.find(t => t.name === result.metadata.name);
      if (tool) {
        recommendedTools.push(tool);
      }
    });

    // 4. Fiyat Filtresi (Varsa uygula)
    if (pricingFilter && pricingFilter !== 'all') {
      recommendedTools = recommendedTools.filter(t => {
        if (pricingFilter === 'free') return t.pricing.free || t.pricing.freemium;
        if (pricingFilter === 'paid') return t.pricing.paidOnly || t.pricing.freemium;
        return true;
      });
    }

    // Hiç araç bulunamadıysa (çok nadir olur ama güvenlik önlemi)
    if (recommendedTools.length === 0) {
      console.log('[API] Vektörden sonuç çıkmadı, kategori yedeğine geçiliyor...');
      recommendedTools = allTools.filter(t => t.category === intent.primaryCategory);
    }

    if (recommendedTools.length === 0) {
      return NextResponse.json({ error: "Bu istek için uygun araç bulunamadı" });
    }

    // 5. Sonuçları Hazırla
    const [main, ...rest] = recommendedTools;

    // Neden seçildiğini açıkla
    const explanation = generateExplanation(intent, main);

    return NextResponse.json({
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
      alternatives: rest.slice(0, 3).map((t) => ({
        toolName: t.name,
        description: t.description,
        url: t.url,
        pricing: t.pricing,
        strength: t.strength,
      })),
      _debug: {
        source: 'vector-search',
        matchScore: searchResults[0]?.score // Ne kadar emin olduğunu görelim
      }
    });

  } catch (error) {
    console.error("API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
