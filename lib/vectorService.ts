import { Index } from "@upstash/vector";
import OpenAI from "openai";
import { kv } from "./kv";
import { hashString } from "./hash";
import { getPricingModel } from "./pricing";
import { normalizeTr, tokenizeTr } from "./text";

// ================================================================
// Vektor aramasi bayrakla KAPALI (tanimsiz = kapali, acmak icin 'true').
//
// Neden: (a) Uretimdeki Upstash Vector ornegi olu — REST ucu bos govde donuyor,
// @upstash/vector JSON parse'inda "Unexpected end of JSON input" ile patliyor
// (seed'i de bu dusurdu); (b) embedding metni bestFor.tr'yi iceriyor ve o alan
// 96/96 bos, yani simdi yeniden gomsek bos veriyi gomeriz.
//
// Kod SILINMEDI: bayrak acilinca eski yol aynen calisir. Kapaliyken vektor
// yoluna hic girilmez, dolayisiyla OpenAI embedding cagrisi da yapilmaz.
// ================================================================
const VECTOR_SEARCH_ENABLED = process.env.VECTOR_SEARCH_ENABLED === 'true';

/** Bayrak acikken vektor sorgusunun bekleyebilecegi ust sinir. */
const VECTOR_QUERY_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${label}: ${ms}ms zaman asimi`)), ms)
        ),
    ]);
}

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
    // Bayrak kapaliysa vektor yoluna HIC girilmez: olu host'a baglanmayi
    // beklemek yok, gereksiz embedding cagrisi yok.
    if (!VECTOR_SEARCH_ENABLED) {
        return keywordFallbackSearch(query, topK);
    }

    try {
        const index = getIndex();

        // 1. Embedding'i cache'li fonksiyonla al (cache HIT ise ~0ms)
        const queryVector = await getEmbedding(query);

        // 2. Vektör veritabanında en yakın anlamlı sonuçları ara
        const results = await withTimeout(
            index.query({
                vector: queryVector,
                topK: topK,
                includeMetadata: true,
            }),
            VECTOR_QUERY_TIMEOUT_MS,
            'Vektor sorgusu'
        );

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

// ================================================================
// Anahtar kelime araması
//
// Eskiden sorgu kelimesi araç metninde SUBSTRING olarak aranıyordu: "için"
// ve "var" neredeyse her açıklamada geçtiği için alakasız araçlar puan
// topluyordu ("python kodumda hata var" -> Microsoft Copilot Pro), "videosu"
// ise hiçbir metinde geçmediği için video araçları puan alamıyordu.
// ================================================================

// Anlam taşımayan dolgu kelimeleri. Eşleştirme normalize metinde yapıldığı
// için liste de normalize edilir ("için" -> "icin").
const SEARCH_STOP_WORDS = new Set([
    // tr
    'için', 've', 'bir', 'bu', 'ile', 'var', 'yok', 'mi', 'çok', 'daha', 'gibi', 'istiyorum', 'olarak',
    // en
    'the', 'a', 'an', 'for', 'and', 'to', 'of', 'with', 'i', 'want', 'my', 'need',
].map(normalizeTr));

/** Sorgudan arama terimleri: normalize, kelimelere böl, dolgu ve 2 harften kısa kelimeleri at. */
export function searchTerms(query: string): string[] {
    return tokenizeTr(query).filter(word => word.length >= 2 && !SEARCH_STOP_WORDS.has(word));
}

/**
 * Sorgu kelimesi bir araç kelimesiyle eşleşir mi? Türkçe ekler yüzünden önek:
 *  - araç kelimesi (≥3 harf) sorgu kelimesinin öneki: "videosu" -> "video", "kodumda" -> "kod"
 *  - sorgu kelimesi (≥4 harf) araç kelimesinin öneki: "sunu" -> "sunum"
 */
export function wordsMatch(queryWord: string, toolWord: string): boolean {
    return (toolWord.length >= 3 && queryWord.startsWith(toolWord))
        || (queryWord.length >= 4 && toolWord.startsWith(queryWord));
}

async function keywordFallbackSearch(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const { getTools, getLocalized } = await import('./toolsService');
        const allTools = await getTools();
        // Diakritik-duyarsiz: "dugun" yazan kullanici "düğün" verisini bulsun.
        const queryWords = searchTerms(query);

        const scored = allTools.map(tool => {
            let score = 0;
            const toolWords = new Set(tokenizeTr(
                `${tool.name} ${getLocalized(tool, 'description')} ${tool.category} ${getLocalized(tool, 'bestFor').join(' ')}`
            ));
            // Her sorgu kelimesi araç başına en fazla 1 puan getirir.
            for (const word of queryWords) {
                for (const toolWord of toolWords) {
                    if (wordsMatch(word, toolWord)) {
                        score++;
                        break;
                    }
                }
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
                    pricing: getPricingModel(s.tool.pricing),
                    strength: s.tool.strength,
                },
            }));
    } catch (fallbackError) {
        console.error('Keyword fallback de başarısız:', fallbackError);
        return [];
    }
}
