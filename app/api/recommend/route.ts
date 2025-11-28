import { NextRequest, NextResponse } from "next/server";
import { getRankedToolsByIntent, generateExplanation } from "@/lib/toolsService";
import { analyzeIntent } from "@/lib/intent";

export async function POST(req: NextRequest) {
  try {
    const { prompt, pricingFilter } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Lutfen bir istek yazin." },
        { status: 400 }
      );
    }

    console.log('[API] Analyzing intent for:', prompt);
    const intentResult = await analyzeIntent(prompt);

    if ('code' in intentResult) {
      return NextResponse.json({
        error: intentResult.message,
        suggestions: intentResult.suggestions,
      });
    }

    const intent = intentResult;
    console.log('[API] Intent detected:', intent);

    const tools = await getRankedToolsByIntent(intent, { pricingFilter });

    if (!tools.length) {
      return NextResponse.json({
        error: "Bu kategori icin arac bulunamadi",
      });
    }

    const [main, ...rest] = tools;
    const explanation = generateExplanation(intent, main);

    const alternatives = rest.slice(0, 3).map((t) => ({
      toolName: t.name,
      description: t.description,
      url: t.url,
      pricing: t.pricing,
      strength: t.strength,
    }));

    return NextResponse.json({
      category: intent.primaryCategory,
      main: {
        toolName: main.name,
        description: main.description,
        url: main.url,
        pricing: main.pricing,
        strength: main.strength,
        why: explanation,
      },
      alternatives,
      _debug: {
        intent: intent,
        confidence: intent.confidence,
      },
    });
  } catch (error) {
    console.error("API Hatasi:", error);
    return NextResponse.json(
      { error: "Sunucu hatasi" },
      { status: 500 }
    );
  }
}
