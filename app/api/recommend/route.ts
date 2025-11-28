import { NextRequest, NextResponse } from "next/server";
import { getRankedToolsByCategory } from "@/lib/toolsService";
import { detectCategory } from "@/lib/keywords";

export async function POST(req: NextRequest) {
  try {
    const { prompt, pricingFilter } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Lutfen bir istek yazin." }, { status: 400 });
    }

    const category = detectCategory(prompt);
    if (!category) {
      return NextResponse.json({ error: "Kategori tespit edilemedi" });
    }

    const tools = await getRankedToolsByCategory(category, { pricingFilter });

    if (!tools.length) {
      return NextResponse.json({ error: "Bu kategori icin arac bulunamadi" });
    }

    const [main, ...rest] = tools;
    const alternatives = rest.slice(0, 3).map((t) => ({
      toolName: t.name,
      description: t.description,
      url: t.url,
      pricing: t.pricing,
      strength: t.strength
    }));

    return NextResponse.json({
      category,
      main: {
        toolName: main.name,
        description: main.description,
        url: main.url,
        pricing: main.pricing,
        strength: main.strength
      },
      alternatives
    });
  } catch (error) {
    console.error("API Hatasi:", error);
    return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  }
}
