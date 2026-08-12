import { NextRequest, NextResponse } from "next/server";
import { Index } from "@upstash/vector";
import OpenAI from "openai";
import { updateTools, invalidateToolsCache, getLocalized, Tool } from "@/lib/toolsService";
import { getPricingModel } from "@/lib/pricing";
import toolsDatabase from "@/lib/tools-database.json";

export const maxDuration = 60; // Vercel hobby tier maks timeout engelleme (60 saniye)
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

export async function GET(request: NextRequest) {
    const adminSecret = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return Response.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    try {
        const index = getIndex();
        const openai = getOpenAI();

        console.log("🚀 Gelişmiş veri göçü başlıyor...");

        // Tools already in the correct format from tools-database.json
        const formattedTools = toolsDatabase as Tool[];

        console.log(`📊 Toplam ${formattedTools.length} araç işlendi.`);

        // 2. KV Veritabanını Güncelle (Listeleme için)
        await updateTools(formattedTools);
        console.log("✅ KV (Redis) güncellendi.");

        // 3. Vektör Veritabanını Sıfırla ve Doldur (Arama için)
        await index.reset();
        console.log("🧹 Vektör DB temizlendi.");

        let successCount = 0;
        const BATCH_SIZE = 10;

        for (let i = 0; i < formattedTools.length; i += BATCH_SIZE) {
            const batch = formattedTools.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (tool) => {
                const textToEmbed = `
        Tool: ${tool.name}
        Category: ${tool.category}
        Description: ${getLocalized(tool, 'description')}
        Tasks: ${getLocalized(tool, 'bestFor').join(", ")}
        Features: ${tool.features?.join(", ")}
        Pricing: ${getPricingModel(tool.pricing)}
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
                        description: getLocalized(tool, 'description'),
                        url: tool.url,
                        pricing: JSON.stringify(tool.pricing),
                        strength: tool.strength
                    }
                });

                console.log(`✅ Vektör: ${tool.name}`);
                successCount++;
            }));
        }

        invalidateToolsCache();

        return NextResponse.json({
            success: true,
            message: `Sistem Yükseltildi! ${successCount} adet yeni nesil araç yüklendi.`
        });

    } catch (error) {
        console.error("Seed Hatası:", error);
        return NextResponse.json({ error: "Hata: " + error }, { status: 500 });
    }
}
