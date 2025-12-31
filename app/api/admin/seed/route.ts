import { NextResponse } from "next/server";
import { Index } from "@upstash/vector";
import OpenAI from "openai";
import { BASE_TOOLS } from "@/lib/toolsService";

// İstemci Kurulumları
const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
    try {
        console.log("🚀 Veri göçü başlıyor...");

        // Önce veritabanını temizleyelim (opsiyonel, temiz bir başlangıç için)
        await index.reset();
        console.log("🧹 Veritabanı temizlendi.");

        let successCount = 0;

        for (const tool of BASE_TOOLS) {
            // 1. Aranabilir metni oluştur
            // Kullanıcı ne ararsa bu çıksın? Açıklama, özellikler ve kullanım alanlarını birleştiriyoruz.
            const textToEmbed = `
        Tool: ${tool.name}
        Category: ${tool.category}
        Description: ${tool.description}
        Best For: ${tool.bestFor.join(", ")}
        Features: ${tool.features?.join(", ")}
        Pricing: ${tool.pricing.free ? "Free" : "Paid"}
      `.trim();

            // 2. OpenAI ile vektöre (embedding) çevir
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small", // Hızlı ve ucuz model
                input: textToEmbed,
                encoding_format: "float",
            });

            const vector = embeddingResponse.data[0].embedding;

            // 3. Upstash Vector'e kaydet
            await index.upsert({
                id: tool.name, // ID olarak ismini kullanıyoruz
                vector: vector,
                metadata: {
                    name: tool.name,
                    category: tool.category,
                    description: tool.description,
                    url: tool.url,
                    pricing: JSON.stringify(tool.pricing), // Metadata'da obje saklamak için stringify
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
