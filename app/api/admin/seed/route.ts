import { NextResponse } from "next/server";
import { Index } from "@upstash/vector";
import OpenAI from "openai";
import { updateTools, Tool } from "@/lib/toolsService";
// Yeni JSON dosyasını import ediyoruz
import rawData from "@/lib/new_tools.json";

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

// Kategori Çevirici (İngilizce JSON -> Senin Sistemin)
const categoryMap: Record<string, "gorsel" | "metin" | "ses" | "arastirma" | "video" | "veri" | "kod"> = {
    "text": "metin",
    "image": "gorsel",
    "audio": "ses",
    "video": "video",
    "code": "kod",
    "research": "arastirma",
    "productivity": "veri",
    "agent": "kod",
    "3d": "gorsel",
    "vertical-auto": "veri",
    "vertical-finance": "veri"
};

export async function GET() {
    try {
        const index = getIndex();
        const openai = getOpenAI();

        console.log("🚀 Gelişmiş veri göçü başlıyor...");

        // 1. Veriyi Dönüştür (Transformation)
        const formattedTools: Tool[] = (rawData as any[]).map((item: any) => {
            // Fiyatlandırma mantığını çevir
            const isFree = item.pricing === "free";
            const isFreemium = item.pricing === "freemium";
            const isPaid = item.pricing === "paid";

            return {
                name: item.name,
                category: categoryMap[item.category] || "arastirma",
                description: item.strengthReason || "Yapay zeka aracı",
                url: item.url,
                pricing: {
                    free: isFree,
                    freemium: isFreemium,
                    paidOnly: isPaid,
                    startingPrice: 0,
                    currency: "USD" as const
                },
                bestFor: item.tasks || [],
                strength: 9.5,
                features: item.modalities || [],
                lastUpdated: item.launchOrUpdate,
                inputTypes: ["text"] as ('text' | 'image' | 'audio' | 'video' | 'data' | 'code')[],
                outputTypes: ["text"] as ('text' | 'image' | 'audio' | 'video' | 'data' | 'code' | 'document')[],
                skillLevel: "intermediate" as const,
                speed: "fast" as const
            };
        });

        console.log(`📊 Toplam ${formattedTools.length} araç işlendi.`);

        // 2. KV Veritabanını Güncelle (Listeleme için)
        await updateTools(formattedTools);
        console.log("✅ KV (Redis) güncellendi.");

        // 3. Vektör Veritabanını Sıfırla ve Doldur (Arama için)
        await index.reset();
        console.log("🧹 Vektör DB temizlendi.");

        let successCount = 0;

        for (const tool of formattedTools) {
            const textToEmbed = `
        Tool: ${tool.name}
        Category: ${tool.category}
        Description: ${tool.description}
        Tasks: ${tool.bestFor.join(", ")}
        Features: ${tool.features?.join(", ")}
        Pricing: ${tool.pricing.free ? "Free" : tool.pricing.freemium ? "Freemium" : "Paid"}
      `.trim();

            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: textToEmbed,
                encoding_format: "float",
            });

            await index.upsert({
                id: tool.name,
                vector: embeddingResponse.data[0].embedding,
                metadata: {
                    name: tool.name,
                    category: tool.category,
                    description: tool.description,
                    url: tool.url,
                    pricing: JSON.stringify(tool.pricing),
                    strength: tool.strength
                }
            });

            console.log(`✅ Vektör: ${tool.name}`);
            successCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Sistem Yükseltildi! ${successCount} adet yeni nesil araç yüklendi.`
        });

    } catch (error) {
        console.error("Seed Hatası:", error);
        return NextResponse.json({ error: "Hata: " + error }, { status: 500 });
    }
}
