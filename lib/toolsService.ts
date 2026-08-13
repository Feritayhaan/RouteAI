// RouteAI Tools Service - Vercel KV Storage
// Manages AI tools in Upstash Redis with auto-initialization

import { kv } from './kv';
import { Category } from './keywords';
import { ParsedIntent } from './intent/types';
import {
    ToolPricing,
    getPricingModel,
    hasFreeTier,
    isPaidOnly,
    makePricing,
    matchesPricingFilter,
} from './pricing';
import toolsDatabase from './tools-database.json';

// seed ucu yazdiktan sonra KV'yi GERI OKUYUP dogruluyor; anahtar iki yerde
// ayri ayri yazilmasin diye disari aciliyor.
export const KV_TOOLS_KEY = 'tools';

// Fiyat verisi olmayan arac 'paid' sayilir: veri yoklugunda "ucretsiz" demek,
// kullaniciyi yanlis yone gonderen tek hata turudur.
const DEFAULT_PRICING: ToolPricing = makePricing('paid');

// Denetlenmemis kayitlar (Kasim 2025 toplu ithali) siralamada geriye itilir.
// Silmiyoruz — Gun 3'te elden gecirilecekler; sadece ana oneri olarak
// cikmalarini engelliyoruz.
const UNREVIEWED_PENALTY = 1.5;

// Locale primitives. Yeni dil eklemek icin tek yapilacak: SUPPORTED_LOCALES'e ekle.
// Record<Locale, ...> sayesinde eksik ceviri alanlari derleme hatasi verir.
export const SUPPORTED_LOCALES = ['tr', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'tr';
export const FALLBACK_LOCALE: Locale = 'en';

export type LocaleText = Record<Locale, string>;
export type LocaleList = Record<Locale, string[]>;

// Tool TypeScript Interface
export interface Tool {
    id?: string; // Unique slug identifier (e.g., "cursor-ai")
    name: string;
    category: "gorsel" | "metin" | "ses" | "arastirma" | "video" | "veri" | "kod";
    secondaryCategories?: Category[]; // NEW: Tools can span multiple categories
    description: LocaleText;
    url: string;
    /** makePricing() ile uretilir; bayraklar model'den turer. Bkz. lib/pricing.ts */
    pricing: ToolPricing;
    bestFor: LocaleList;
    strength: number;
    /** 'unreviewed' = fiyat/guc verisi elden gecmemis toplu ithal kaydi. */
    reviewStatus?: 'reviewed' | 'unreviewed';
    features?: string[];
    lastUpdated?: string;
    deprecated?: boolean;

    // NEW: Workflow integration fields
    inputTypes?: ('text' | 'image' | 'audio' | 'video' | 'data' | 'code')[];
    outputTypes?: ('text' | 'image' | 'audio' | 'video' | 'data' | 'code' | 'document')[];
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    speed?: 'fast' | 'medium' | 'slow';
}

export interface ToolFilters {
    pricingFilter?: "all" | "free" | "paid";
    tools?: Tool[];
}

function isFilled(value: unknown): boolean {
    return Array.isArray(value)
        ? value.length > 0
        : typeof value === 'string' && value.trim().length > 0;
}

/**
 * Locale'e gore bir aracin cevrilebilir alanini okur.
 * Fallback zinciri: istenen locale -> FALLBACK_LOCALE ('en') -> bos.
 *
 * Bos dize/dizi "yok" sayilir: migration sonrasi bestFor.tr bos olacagi icin
 * tr locale'de en'e dusulmesi sarttir, aksi halde keyword skorlamasi sifirlanir.
 *
 * Eski sema (duz string / string[]) da tolere edilir. Bu, KV'de duran migration
 * oncesi veriyi KV'ye hic yazmadan guvenli kilar.
 */
export function getLocalized(tool: Tool, field: 'description', locale?: Locale): string;
export function getLocalized(tool: Tool, field: 'bestFor', locale?: Locale): string[];
export function getLocalized(
    tool: Tool,
    field: 'description' | 'bestFor',
    locale: Locale = DEFAULT_LOCALE
): string | string[] {
    const empty = field === 'bestFor' ? [] : '';
    const raw = tool?.[field] as unknown;

    if (typeof raw === 'string' || Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== 'object') return empty;

    const map = raw as Record<string, string | string[] | undefined>;

    for (const key of [locale, FALLBACK_LOCALE]) {
        if (isFilled(map[key])) return map[key]!;
    }
    return empty;
}

/** Serbest bir dil kodunu (or. intent.constraints.language) desteklenen bir locale'e daraltir. */
export function resolveLocale(language?: string): Locale {
    return SUPPORTED_LOCALES.includes(language as Locale) ? (language as Locale) : DEFAULT_LOCALE;
}

// Tools loaded from merged JSON database
export const BASE_TOOLS: Tool[] = toolsDatabase as Tool[];

let toolsCache: { data: Tool[]; expiry: number } | null = null;
const TOOLS_CACHE_TTL = 5 * 60 * 1000; // 5 dakika

export function invalidateToolsCache() {
    toolsCache = null;
}

/**
 * Initialize tools in KV if not exists
 */
async function initializeTools(): Promise<void> {
    try {
        const existing = await kv.get<Tool[]>(KV_TOOLS_KEY);
        if (!existing || existing.length === 0) {
            await kv.set(KV_TOOLS_KEY, BASE_TOOLS);
            console.log('[init] Tools initialized in KV with', BASE_TOOLS.length, 'tools');
        }
    } catch (error) {
        console.warn('[init] KV unavailable, using BASE_TOOLS fallback. Error:', error);
    }
}

/**
 * Get all tools with 3-tier fallback:
 *  1. In-memory cache (fast, survives within same serverless invocation)
 *  2. Upstash KV (persistent, survives cold starts)
 *  3. tools-database.json (local static fallback, always available)
 *
 * Vercel serverless cold start sonrası memory cache sıfırlanır,
 * bu durumda KV'den çekilir. KV de erişilemezse JSON'dan okunur.
 */
export async function getTools(): Promise<Tool[]> {
    // TIER 1: In-memory cache (en hızlı, cold start'ta boş olur)
    if (toolsCache && Date.now() < toolsCache.expiry) {
        console.log('[getTools] Tier 1: Memory cache HIT');
        return toolsCache.data;
    }

    // TIER 2: Upstash KV (persistent, cold start'tan sonra buradan çekilir)
    try {
        let tools = await kv.get<Tool[]>(KV_TOOLS_KEY);

        // Auto-initialize if empty
        if (!tools || tools.length === 0) {
            console.log('[getTools] KV empty, initializing from BASE_TOOLS...');
            await initializeTools();
            tools = await kv.get<Tool[]>(KV_TOOLS_KEY);
        }

        if (tools && tools.length > 0) {
            console.log('[getTools] Tier 2: KV HIT -', tools.length, 'tools');
            toolsCache = { data: tools, expiry: Date.now() + TOOLS_CACHE_TTL };
            return tools;
        }
    } catch (error) {
        console.warn('[getTools] Tier 2: KV unavailable:', error);
    }

    // TIER 3: Static JSON fallback (always available, never fails)
    console.log('[getTools] Tier 3: BASE_TOOLS fallback -', BASE_TOOLS.length, 'tools');
    toolsCache = { data: BASE_TOOLS, expiry: Date.now() + TOOLS_CACHE_TTL };
    return BASE_TOOLS;
}

/**
 * Get ranked tools by category with optional pricing filter
 */
export async function getRankedToolsByCategory(
    category: Category,
    options?: {
        pricingFilter?: "all" | "free" | "paid";
    }
): Promise<Tool[]> {
    const all = await getTools();

    // 1) Filter by category and exclude deprecated, normalize pricing
    let tools = all
        .filter((t) => t.category === category && !t.deprecated)
        .map((t) => ({
            ...t,
            pricing: t.pricing ?? DEFAULT_PRICING
        }));

    // 2) Apply pricing filter
    if (options?.pricingFilter && options.pricingFilter !== "all") {
        tools = tools.filter((t) => matchesPricingFilter(t.pricing, options.pricingFilter));
    }

    // 3) Simple scoring: strength + free/freemium bonus - denetlenmemis cezasi
    const scored = tools.map((t) => {
        const model = getPricingModel(t.pricing);
        let score = t.strength ?? 8;
        if (model === 'free') score += 0.3;
        if (model === 'freemium') score += 0.1;
        if (t.reviewStatus === 'unreviewed') score -= UNREVIEWED_PENALTY;
        return { tool: t, score };
    });

    // 4) Sort by score
    scored.sort((a, b) => b.score - a.score);

    // 5) Return tool list
    return scored.map((s) => s.tool);
}

/**
 * Update tools in KV
 */
export async function updateTools(tools: Tool[]): Promise<void> {
    try {
        await kv.set(KV_TOOLS_KEY, tools);
        console.log('[update] Tools updated in KV:', tools.length, 'tools');
    } catch (error) {
        console.warn('[update] KV unavailable, skipping KV update. Error:', error);
    }
}

/**
 * Get tools by category
 */
export async function getToolsByCategory(category: string): Promise<Tool[]> {
    const tools = await getTools();
    return tools.filter(tool => tool.category === category);
}

/**
 * Get top tools by strength
 */
export async function getTopTools(limit: number = 5): Promise<Tool[]> {
    const tools = await getTools();
    return [...tools]
        .sort((a, b) => b.strength - a.strength)
        .slice(0, limit);
}

/**
 * Find tool by name
 */
export async function findToolByName(name: string): Promise<Tool | undefined> {
    const tools = await getTools();
    return tools.find(tool => tool.name === name);
}

function computeKeywordSimilarity(tool: Tool, intent: ParsedIntent): number {
    const keywords = intent.keywords?.map((k) => k.toLowerCase()) ?? [];
    const bestFor = getLocalized(tool, 'bestFor', resolveLocale(intent.constraints?.language))
        .map((b) => b.toLowerCase());

    if (keywords.length === 0 || bestFor.length === 0) return 0;

    const matches = keywords.reduce((count, keyword) => {
        return count + (bestFor.some((bf) => bf.includes(keyword)) ? 1 : 0);
    }, 0);

    return matches / Math.max(keywords.length, bestFor.length, 1);
}

function matchesPricingPreference(tool: Tool, intent: ParsedIntent): boolean {
    const pricing = tool.pricing ?? DEFAULT_PRICING;
    // 'free' istegi tam ucretsiz demek: freemium burada yeterli degil.
    if (intent.constraints.pricing === 'free') return getPricingModel(pricing) === 'free';
    // 'paid' istegi artik freemium'u KAPSAMIYOR — ayrimin coktugu yer burasiydi.
    if (intent.constraints.pricing === 'paid') return isPaidOnly(pricing);
    return true;
}

// TODO: Normalize edilmis agirlikli formule gecilecek:
//   vektor 0.55 + bestFor eslesmesi 0.30 + (strength / 100) * 0.15
// strength 100'luk skalaya gecince bu formul strength'i ham puan olarak toplamaya
// devam ederse diger sinyalleri ezer (similarity max ~4, pricing ~±3). Ara durumda
// tutarsizlik bilinctli: eval'e kadar deploy yok.
/**
 * Calculate overall tool score blending similarity, pricing alignment and inherent strength.
 */
export function scoreTool(tool: Tool, intent: ParsedIntent, filters?: ToolFilters): number {
    const pricing = tool.pricing ?? DEFAULT_PRICING;
    const model = getPricingModel(pricing);
    const strengthScore = tool.strength ?? 8;

    const similarityScore = computeKeywordSimilarity(tool, intent) * 4; // Up to ~4 bonus points

    let pricingScore = 0;
    if (intent.constraints.pricing === 'free') {
        pricingScore += model === 'free' ? 2 : model === 'freemium' ? 1 : -3;
    } else if (intent.constraints.pricing === 'paid') {
        pricingScore += isPaidOnly(pricing) ? 1 : -1;
    } else if (intent.constraints.pricing === 'freemium' && model === 'freemium') {
        pricingScore += 0.5;
    }

    if (filters?.pricingFilter === 'free' && hasFreeTier(pricing)) {
        pricingScore += 0.5;
    } else if (filters?.pricingFilter === 'paid' && isPaidOnly(pricing)) {
        pricingScore += 0.3;
    }

    if (intent.constraints.speed === 'fast' && tool.features?.some((f) => f.toLowerCase().includes('fast'))) {
        pricingScore += 0.2;
    }

    if (intent.constraints.expertise === 'beginner' && model === 'free') {
        pricingScore += 0.2;
    }

    // Denetlenmemis kayit ana oneri olarak cikmasin (Qwen3-VL, Devmate, Antigravity...)
    const reviewPenalty = tool.reviewStatus === 'unreviewed' ? UNREVIEWED_PENALTY : 0;

    return strengthScore + similarityScore + pricingScore - reviewPenalty;
}

export async function getRankedToolsByIntent(
    intent: ParsedIntent,
    options?: ToolFilters
): Promise<Tool[]> {
    let tools = (options?.tools ?? (await getToolsByCategory(intent.primaryCategory))).map((t) => ({
        ...t,
        pricing: t.pricing ?? DEFAULT_PRICING,
    }));

    tools = tools.filter((tool) => matchesPricingPreference(tool, intent));

    if (options?.pricingFilter) {
        tools = tools.filter((tool) => matchesPricingFilter(tool.pricing, options.pricingFilter));
    }

    const scored = tools
        .map((tool) => ({
            tool,
            score: scoreTool(tool, intent, options),
        }))
        .sort((a, b) => b.score - a.score);

    return scored.map((s) => s.tool);
}

export function generateExplanation(intent: ParsedIntent, tool: Tool): string {
    const reasons: string[] = [];

    const bestFor = getLocalized(tool, 'bestFor', resolveLocale(intent.constraints?.language));
    const matchingKeywords = (intent.keywords || []).filter(k =>
        bestFor.some(bf => bf.toLowerCase().includes(k.toLowerCase()))
    );
    if (matchingKeywords.length > 0) {
        reasons.push(`"${matchingKeywords[0]}" konusunda uzman`);
    }

    if (intent.constraints?.pricing === 'free' && getPricingModel(tool.pricing) === 'free') {
        reasons.push('Ücretsiz kullanılabiliyor');
    }

    if (tool.strength > 9.5) {
        reasons.push('Sektörün en iyisi');
    } else if (tool.strength > 9) {
        reasons.push('Çok yüksek kaliteli');
    }

    if (intent.constraints?.expertise === 'beginner' && hasFreeTier(tool.pricing)) {
        reasons.push('Yeni başlayanlar için uygun');
    }

    return reasons.length > 0
        ? `Bu aracı seçtim çünkü: ${reasons.join(', ')}.`
        : `${tool.name} bu kategori için en iyi seçeneklerden biri.`;
}
