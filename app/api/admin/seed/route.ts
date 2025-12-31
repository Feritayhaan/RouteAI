import { NextResponse } from "next/server";
import { Index } from "@upstash/vector";
import OpenAI from "openai";
import { BASE_TOOLS } from "@/lib/toolsService";

// Lazy initialization - build time'da env vars olmayabilir
function getIndex(): Index {
    return new Index({
        url: process.env.UPSTASH_VECTOR_REST_URL!,
        token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
}

function getOpenAI(): OpenAI {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

export async function GET() {
    try {
        const index = getIndex();
        const openai = getOpenAI();

        console.log("🚀 Veri göçü başlıyor...");

        // Önce veritabanını temizleyelim
        await index.reset();
        console.log("🧹 Veritabanı temizlendi.");

        let successCount = 0;

        for (const tool of BASE_TOOLS) {
            const textToEmbed = `
        Tool: ${tool.name}
        Category: ${tool.category}
        Description: ${tool.description}
        Best For: ${tool.bestFor.join(", ")}
        Features: ${tool.features?.join(", ")}
        Pricing: ${tool.pricing.free ? "Free" : "Paid"}
      `.trim();

            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: textToEmbed,
                encoding_format: "float",
            });

            const vector = embeddingResponse.data[0].embedding;

            await index.upsert({
                id: tool.name,
                vector: vector,
                metadata: {
                    name: tool.name,
                    category: tool.category,
                    description: tool.description,
                    url: tool.url,
                    pricing: JSON.stringify(tool.pricing),
                    strength: tool.strength
                }
            });

            console.log(`✅ Eklendi: ${tool.name}`);
            successCount++;
        }

        return NextResponse.json({
            success: true,
            message: `${successCount} araç başarıyla vektör veritabanına yüklendi.`
        });

    } catch (error) {
        console.error("Göç Hatası:", error);
        return NextResponse.json({ error: "Veri göçü sırasında hata oluştu." }, { status: 500 });
    }
}
