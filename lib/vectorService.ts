import { Index } from "@upstash/vector";
import OpenAI from "openai";
import { kv } from "./kv";

// Lazy initialization - build time'da env vars olmayabilir
let _index: Index | null = null;
let _openai: OpenAI | null = null;

function getIndex(): Index {
    if (!_index) {
        _index = new Index({
            url: process.env.UPSTASH_VECTOR_REST_URL!,
            token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
        });
    }
    return _index;
}

function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return _openai;
}

// ================================================================
// Embedding Cache — aynı prompt için OpenAI'ya tekrar gitmez
// ================================================================
const EMB_CACHE_PREFIX = 'emb:';
const EMB_CACHE_TTL = 3600; // 1 saat

/**
 * Simple string hash for cache keys (FNV-1a 32-bit)
 * Edge-uyumlu, crypto.subtle gerektirmez
 */
function hashString(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

/**
 * Embedding'i cache'den al veya OpenAI'dan üret
 */
async function getEmbedding(query: string): Promise<number[]> {
    const cacheKey = `${EMB_CACHE_PREFIX}${hashString(query.toLowerCase().trim())}`;

    // 1. KV cache'den dene
    try {
        const cached = await kv.get<number[]>(cacheKey);
        if (cached && Array.isArray(cached) && cached.length > 0) {
            console.log('[Embedding Cache] HIT');
            return cached;
        }
    } catch (err) {
        console.warn('[Embedding Cache] GET error:', err);
    }

    // 2. OpenAI'dan üret
    const openai = getOpenAI();
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
        encoding_format: "float",
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 3. KV'ye kaydet (fire-and-forget, hata olursa yoksay)
    kv.set(cacheKey, embedding, { ex: EMB_CACHE_TTL }).catch((err) =>
        console.warn('[Embedding Cache] SET error:', err)
    );

    console.log('[Embedding Cache] MISS - üretildi ve cache\'lendi');
    return embedding;
}

export interface SearchResult {
    id: string;
    score: number;
    metadata: {
        name: string;
        category: string;
        description: string;
        url: string;
        pricing: string;
        strength: number;
    };
}

export async function searchTools(query: string, topK: number = 5): Promise<SearchResult[]> {
    try {
        const index = getIndex();

        // 1. Embedding'i cache'li fonksiyonla al (cache HIT ise ~0ms)
        const queryVector = await getEmbedding(query);

        // 2. Vektör veritabanında en yakın anlamlı sonuçları ara
        const results = await index.query({
            vector: queryVector,
            topK: topK,
            includeMetadata: true,
        });

        const typedResults = results as unknown as SearchResult[];

        if (typedResults && typedResults.length > 0) {
            return typedResults;
        }

        // Vektör arama boş döndüyse keyword fallback
        console.warn('Vektör arama sonuç döndürmedi, keyword fallback kullanılıyor');
        return keywordFallbackSearch(query, topK);
    } catch (error) {
        console.error('Vektör arama hatası, keyword fallback kullanılıyor:', error);
        return keywordFallbackSearch(query, topK);
    }
}

async function keywordFallbackSearch(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const { getTools, getLocalized } = await import('./toolsService');
        const allTools = await getTools();
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);

        const scored = allTools.map(tool => {
            let score = 0;
            const toolText = `${tool.name} ${getLocalized(tool, 'description')} ${tool.category} ${getLocalized(tool, 'bestFor').join(' ')}`.toLowerCase();
            for (const word of queryWords) {
                if (toolText.includes(word)) score++;
            }
            return { tool, score };
        });

        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => ({
                id: s.tool.name,
                score: s.score,
                metadata: {
                    name: s.tool.name,
                    category: s.tool.category,
                    description: getLocalized(s.tool, 'description'),
                    url: s.tool.url,
                    pricing: s.tool.pricing.free ? 'free' : s.tool.pricing.freemium ? 'freemium' : 'paid',
                    strength: s.tool.strength,
                },
            }));
    } catch (fallbackError) {
        console.error('Keyword fallback de başarısız:', fallbackError);
        return [];
    }
}
