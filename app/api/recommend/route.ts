import { NextRequest, NextResponse } from "next/server";
import { analyzeIntent } from "@/lib/intent";
import { generateWorkflow, formatWorkflowForApi } from "@/lib/workflow";
import { searchTools } from "@/lib/vectorService"; // Az önce oluşturduğumuz servis
import { getTools, generateExplanation, Tool } from "@/lib/toolsService";

export async function POST(req: NextRequest) {
  try {
    const { prompt, pricingFilter } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Lütfen bir istek yazın." },
        { status: 400 }
      );
    }

    console.log('[API] İstek analiz ediliyor:', prompt);

    // 1. Niyet Analizi (Hala kullanıyoruz çünkü kullanıcının "kod" mu istediğini anlamalıyız)
    const intentResult = await analyzeIntent(prompt);

    // Eğer kullanıcı kod istediyse direkt döndür
    if ('code' in intentResult) {
      return NextResponse.json({
        error: intentResult.message,
        suggestions: intentResult.suggestions,
      });
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
