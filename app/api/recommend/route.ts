import { NextRequest, NextResponse } from "next/server";
import { getTools } from "@/lib/toolsService";
import { detectCategory } from "@/lib/keywords";

// Fallback recommendation without LLM (uses local matching)
async function getFallbackRecommendation(prompt: string) {
  const category = detectCategory(prompt);
  const allTools = await getTools();

  // Kategoriye göre filtrele
  let candidates = category
    ? allTools.filter(t => t.category === category)
    : allTools;

  // Strength'e göre sırala
  candidates.sort((a, b) => b.strength - a.strength);

  const best = candidates[0];

  if (!best) {
    return {
      toolName: "Gemini 2.5 Pro",
      description: "Genel amaçlı en güçlü ücretsiz araç",
      reason: "Fallback: En yüksek strength araç seçildi",
      suggestedPrompt: prompt,
      url: "https://gemini.google.com"
    };
  }

  return {
    toolName: best.name,
    description: best.description,
    reason: `${best.category} kategorisinde en güçlü araç (Güç: ${best.strength}/10)`,
    suggestedPrompt: prompt,
    url: best.url
  };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    // Validation
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Lütfen bir istek yazın." },
        { status: 400 }
      );
    }

    // Keyword-based pre-filtering
    const detectedCategory = detectCategory(prompt);
    console.log(`Detected category: ${detectedCategory || 'none'}`);

    // LLM DEVRE DIŞI – Fallback daha iyi çalışıyor
    console.log("LLM geçici olarak devre dışı – en iyi sonucu fallback veriyor");
    const fallbackResponse = await getFallbackRecommendation(prompt);
    return NextResponse.json(fallbackResponse);

  } catch (error) {
    console.error("API Hatası:", error);

    // Final fallback
    return NextResponse.json({
      toolName: "Gemini 2.5 Pro",
      description: "Güçlü multimodal araç",
      reason: "Sistem hatası, varsayılan araç öneriliyor",
      suggestedPrompt: prompt,
      url: "https://gemini.google.com"
    });
  }
}