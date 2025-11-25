import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { getTools } from "@/lib/toolsService";
import { detectCategory } from "@/lib/keywords";
import { findBestTool } from "@/lib/utils/toolMatcher";

// Fallback recommendation without LLM (uses local matching)
async function getFallbackRecommendation(prompt: string) {
  const category = detectCategory(prompt);
  const bestTool = await findBestTool(prompt, category ?? null);

  if (!bestTool) {
    return {
      toolName: "Perplexity Deep Research",
      description: "Kaynaklı araştırma için en iyi araç",
      reason: "Bu isteğe uygun spesifik araç bulunamadı",
      suggestedPrompt: `"${prompt}" hakkında detaylı bilgi bul`,
      url: "https://perplexity.ai"
    };
  }

  return {
    toolName: bestTool.name,
    description: bestTool.description,
    reason: `${bestTool.category} kategorisinde en uygun araç (Güç: ${bestTool.strength}/10)`,
    suggestedPrompt: `${prompt} için ${bestTool.name} kullan`,
    url: bestTool.url
  };
}

// System prompt with dynamic tool injection
function buildSystemPrompt(tools: Awaited<ReturnType<typeof getTools>>) {
  const toolList = tools.map((tool, idx) =>
    `${idx + 1}. **${tool.name}** (${tool.category}): ${tool.description} (Ücretsiz: ${tool.free ? 'Evet' : 'Hayır'}, Güç: ${tool.strength}/10)`
  ).join('\n');

  return `Sen RouteAI'sın. Kullanıcı isteğini analiz et ve en uygun AI aracını öner.

MEVCUT ARAÇLAR:
${toolList}

ANALİZ YÖNTEMİ:
1. Kullanıcı isteğindeki alanı belirle (görsel, metin, ses, video, veri, araştırma)
2. Amacı anla (ne yapmak istiyor?)
3. En uygun aracı seç (strength ve bestFor kriterlerine göre)
4. Kullanıcının direkt kullanabileceği Türkçe bir prompt yaz

KURALLAR:
- Asla sohbet etme
- Sadece listede olan araçları öner
- Cevabını JSON formatında ver: { "toolName": "...", "description": "...", "reason": "...", "suggestedPrompt": "...", "url": "..." }`;
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

    // Try LLM approach with timeout fallback
    if (process.env.OPENAI_API_KEY) {
      try {
        const tools = await getTools();
        const systemPrompt = buildSystemPrompt(tools);
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Set timeout for OpenAI call
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI timeout')), 8000)
        );

        const completionPromise = client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 500,
        });

        const completion = await Promise.race([completionPromise, timeoutPromise]) as any;
        const aiResponse = completion.choices[0].message.content;

        if (aiResponse) {
          const parsed = JSON.parse(aiResponse);
          return NextResponse.json(parsed);
        }
      } catch (llmError) {
        console.error("LLM Error, using fallback:", llmError);
        // Fall through to fallback
      }
    }

    // Fallback: Use local tool matching
    console.log("Using fallback recommendation");
    const fallbackResponse = await getFallbackRecommendation(prompt);
    return NextResponse.json(fallbackResponse);

  } catch (error) {
    console.error("API Hatası:", error);

    // Final fallback
    return NextResponse.json({
      toolName: "Perplexity Deep Research",
      description: "Kaynaklı araştırma",
      reason: "Sistem hatası, varsayılan araç öneriliyor",
      suggestedPrompt: "İsteğimi bul ve açıkla",
      url: "https://perplexity.ai"
    });
  }
}