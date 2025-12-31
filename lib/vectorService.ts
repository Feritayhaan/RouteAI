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

        return results as unknown as SearchResult[];
    } catch (error) {
        console.error("Vector search error:", error);
        return [];
    }
}
