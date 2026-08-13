import { NextRequest, NextResponse } from "next/server";
import { Index } from "@upstash/vector";
import OpenAI from "openai";
import { kv } from "@/lib/kv";
import { updateTools, invalidateToolsCache, getLocalized, Tool, KV_TOOLS_KEY } from "@/lib/toolsService";
import { getPricingModel } from "@/lib/pricing";
import toolsDatabase from "@/lib/tools-database.json";

export const maxDuration = 60; // Vercel hobby tier maks timeout engelleme (60 saniye)

// Vektor adimi lib/vectorService.ts ile AYNI bayraga baglidir. Eskiden bu uc
// bayragi hic okumuyordu: arama kapaliyken bile olu Upstash Vector'e gidip
// "Unexpected end of JSON input" ile 500 donuyordu.
const VECTOR_SEARCH_ENABLED = process.env.VECTOR_SEARCH_ENABLED === 'true';

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

/**
 * Vektor indeksini sifirlar ve yeniden doldurur.
 * Hatasi CAGIRANA TASINMAZ diye degil — cagiran yakalayip yutuyor; buradaki
 * amac KV yaziminin bu adimdan bagimsiz olmasi.
 */
async function seedVectorIndex(tools: Tool[]): Promise<number> {
    const index = getIndex();
    const openai = getOpenAI();

    await index.reset();
    console.log("🧹 Vektör DB temizlendi.");

    let successCount = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < tools.length; i += BATCH_SIZE) {
        const batch = tools.slice(i, i + BATCH_SIZE);

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

    return successCount;
}

export async function GET(request: NextRequest) {
    const adminSecret = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return Response.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    let written = 0;
    let vectorSkipped = true;
    let vectorError: string | undefined;

    try {
        console.log("🚀 Gelişmiş veri göçü başlıyor...");

        // Tools already in the correct format from tools-database.json
        const formattedTools = toolsDatabase as Tool[];
        console.log(`📊 Toplam ${formattedTools.length} araç işlendi.`);

        // ============================================================
        // 1) KV yazimi. Bu adim HER DURUMDA tamamlanir; asagidaki vektor
        //    adiminin basarisi ya da basarisizligi buraya dokunamaz.
        // ============================================================
        await updateTools(formattedTools);

        // updateTools KV hatasini yutuyor (try/catch + warn), yani cagri
        // donmus olmasi yazildigini KANITLAMAZ. Geri okuyup sayiyoruz:
        // 'written' bir tahmin degil, KV'de gercekten duran kayit sayisi.
        try {
            const stored = await kv.get<Tool[]>(KV_TOOLS_KEY);
            written = Array.isArray(stored) ? stored.length : 0;
        } catch (error) {
            console.warn('[seed] KV geri okuma basarisiz:', error);
            written = 0;
        }
        console.log(
            written > 0
                ? `✅ KV (Redis) güncellendi — geri okunan kayıt: ${written}`
                : `⚠️ KV yazımı DOĞRULANAMADI — geri okunan kayıt: 0 (KV erişilemiyor olabilir)`
        );

        invalidateToolsCache();

        // ============================================================
        // 2) Vektor adimi. Bayrak kapaliysa hic girilmez; acikken hatasi
        //    yutulur ve yanitta bildirilir — 500'e cevrilmez.
        // ============================================================
        if (!VECTOR_SEARCH_ENABLED) {
            console.log('[seed] VECTOR_SEARCH_ENABLED != "true" — vektör adımı atlandı.');
        } else {
            try {
                const upserted = await seedVectorIndex(formattedTools);
                vectorSkipped = false;
                console.log(`✅ Vektör indeksi dolduruldu: ${upserted} kayıt.`);
            } catch (error) {
                vectorError = String(error);
                console.error('[seed] Vektör adımı başarısız, KV yazımı korundu:', error);
            }
        }

        return NextResponse.json({
            ok: true,
            written,
            vectorSkipped,
            ...(vectorError ? { error: vectorError } : {}),
        });

    } catch (error) {
        console.error("Seed Hatası:", error);
        return NextResponse.json({
            ok: false,
            written,
            vectorSkipped,
            error: String(error),
        }, { status: 500 });
    }
}
