import { Index } from "@upstash/vector";
import OpenAI from "openai";

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
        const openai = getOpenAI();
        const index = getIndex();

        // 1. Kullanıcının sorusunu sayısal vektöre (embedding) çevir
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: query,
            encoding_format: "float",
        });

        const queryVector = embeddingResponse.data[0].embedding;

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
        const { getTools } = await import('./toolsService');
        const allTools = await getTools();
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);

        const scored = allTools.map(tool => {
            let score = 0;
            const toolText = `${tool.name} ${tool.description} ${tool.category} ${(tool.bestFor || []).join(' ')}`.toLowerCase();
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
                    description: s.tool.description,
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
