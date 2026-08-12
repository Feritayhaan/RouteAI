import { NextRequest, NextResponse } from "next/server";
import { getTools, updateTools, invalidateToolsCache, getLocalized, Tool } from "@/lib/toolsService";
import { getPricingModel, makePricing } from "@/lib/pricing";
import { Index } from "@upstash/vector";
import OpenAI from "openai";

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
 * Dynamic tool update endpoint
 * Future: Integrate with HuggingFace API or web search to discover new AI tools
 * For now: Returns mock data simulating a tool discovery process
 */

export async function POST(req: NextRequest) {
    const adminSecret = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return Response.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        // Simulate tool discovery (future: real web search or API integration)
        const mockNewTools: Tool[] = [
            {
                name: "New AI Tool Example",
                category: "metin" as const,
                description: { tr: "Ornek yeni arac (simulasyon)", en: "" },
                url: "https://example.com",
                pricing: makePricing("freemium"),
                bestFor: { en: ["test"], tr: [] },
                strength: 8.5,
                // Otomatik kesfedilen arac elden gecmemis sayilir: siralamada
                // geriye itilir, ana oneri olarak cikmaz.
                reviewStatus: "unreviewed",
                features: ["demo veri akisi"],
                lastUpdated: new Date().toISOString().slice(0, 10)
            }
        ];

        // Get current tools from KV
        const currentTools = await getTools();

        // Normalize existing tools to satisfy Tool (ensure literal currency)
        // KV'de migration oncesi kayitlar olabilir: modeli eski bayraklardan
        // turetip fiyat nesnesini yeniden uretiyoruz (bayraklar model'den turer).
        const normalizedExisting: Tool[] = currentTools.map((tool): Tool => ({
            ...tool,
            pricing: makePricing(
                getPricingModel(tool.pricing),
                tool.pricing?.startingPrice ?? null,
                tool.pricing?.priceCheckedAt ?? tool.lastUpdated ?? null
            ),
            lastUpdated: tool.lastUpdated ?? new Date().toISOString().slice(0, 10)
        }) satisfies Tool);

        // Deduplicate and filter new tools
        const toolsToAdd: Tool[] = mockNewTools
            .filter(t => t.strength > 8.0)
            .filter(newTool => !normalizedExisting.some(existing => existing.name.toLowerCase() === newTool.name.toLowerCase()))
            .map((tool): Tool => ({
                ...tool,
                pricing: makePricing(
                    getPricingModel(tool.pricing),
                    tool.pricing?.startingPrice ?? null,
                    tool.pricing?.priceCheckedAt ?? tool.lastUpdated ?? null
                ),
                lastUpdated: tool.lastUpdated ?? new Date().toISOString().slice(0, 10)
            }) satisfies Tool);

        const updatedTools: Tool[] = [...normalizedExisting, ...toolsToAdd];

        // Save back to KV
        await updateTools(updatedTools);
        invalidateToolsCache();

        // Update Vector DB for new tools
        if (toolsToAdd.length > 0) {
            const index = getIndex();
            const openai = getOpenAI();
            
            for (const tool of toolsToAdd) {
                const textToEmbed = `
        Tool: ${tool.name}
        Category: ${tool.category}
        Description: ${getLocalized(tool, 'description')}
        Tasks: ${getLocalized(tool, 'bestFor').join(", ")}
        Features: ${(tool.features || []).join(", ")}
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
            }
        }

        return NextResponse.json({
            success: true,
            message: "Tool update sistemi aktif (simulasyon modu)",
            currentToolCount: updatedTools.length,
            newToolsFound: toolsToAdd.length,
            newTools: toolsToAdd,
            note: "Gercek entegrasyon icin HuggingFace API veya web scraping eklenebilir"
        });

    } catch (error) {
        console.error("Update tools error:", error);
        return NextResponse.json(
            { error: "Tool guncelleme hatasi" },
            { status: 500 }
        );
    }
}

// GET endpoint for checking current tool status
export async function GET(req: NextRequest) {
    const adminSecret = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return Response.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        const tools = await getTools();
        const categories = [...new Set(tools.map(t => t.category))];

        return NextResponse.json({
            totalTools: tools.length,
            categories: categories,
            toolsByCategory: categories.map(cat => ({
                category: cat,
                count: tools.filter(t => t.category === cat).length
            })),
            lastUpdate: new Date().toISOString()
        });

    } catch (error) {
        console.error("Get tools error:", error);
        return NextResponse.json(
            { error: "Tool bilgisi alinamadi" },
            { status: 500 }
        );
    }
}
