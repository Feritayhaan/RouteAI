import { NextRequest, NextResponse } from "next/server";
import { BASE_TOOLS, getTools } from "@/lib/toolsService";
import { detectCategory } from "@/lib/keywords";

// Fallback recommendation without LLM (uses local matching)
async function getFallbackRecommendation(prompt: string) {
  const category = detectCategory(prompt);
  const allTools = await getTools();

  // Kategoriye gore filtrele
  let candidates = category
    ? allTools.filter(t => t.category === category)
    : allTools;

  // Strength'e gore sirala
  candidates.sort((a, b) => b.strength - a.strength);

  const best = candidates[0];

  if (!best) {
    return {
      toolName: "Gemini 2.5 Pro",
      description: "Genel amacli guclu arac",
      reason: "Fallback: En yuksek strength arac secildi",
      suggestedPrompt: prompt,
      url: "https://gemini.google.com",
      pricing: {
        free: true,
        freemium: true,
        paidOnly: false,
        startingPrice: 19.99,
        currency: "USD"
      }
    };
  }

  return {
    toolName: best.name,
    description: best.description,
    reason: `${best.category} kategorisinde en guclu arac (Guc: ${best.strength}/10)`,
    suggestedPrompt: prompt,
    url: best.url,
    pricing: best.pricing,
    features: best.features,
    bestFor: best.bestFor,
    lastUpdated: best.lastUpdated,
    category: best.category
  };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    // Validation
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Lutfen bir istek yazin." },
        { status: 400 }
      );
    }

    // Keyword-based pre-filtering
    const detectedCategory = detectCategory(prompt);
    console.log(`Detected category: ${detectedCategory || 'none'}`);

    // LLM devre disi - fallback calisiyor
    const fallbackResponse = await getFallbackRecommendation(prompt);
    return NextResponse.json(fallbackResponse);

  } catch (error) {
    console.error("API Hatasi:", error);

    // Final fallback
    const defaultTool = BASE_TOOLS.find(t => t.name === "Gemini 2.5 Pro") || BASE_TOOLS[0];
    return NextResponse.json({
      toolName: defaultTool.name,
      description: defaultTool.description,
      reason: "Sistem hatasi, varsayilan arac oneriliyor",
      suggestedPrompt: prompt,
      url: defaultTool.url,
      pricing: defaultTool.pricing,
      features: defaultTool.features,
      bestFor: defaultTool.bestFor,
      lastUpdated: defaultTool.lastUpdated,
      category: defaultTool.category
    });
  }
}
