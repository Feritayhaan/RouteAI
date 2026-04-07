// RouteAI Tools Service - Vercel KV Storage
// Manages AI tools in Upstash Redis with auto-initialization

import { kv } from './kv';
import { Category } from './keywords';
import { ParsedIntent } from './intent/types';
import toolsDatabase from './tools-database.json';

const KV_TOOLS_KEY = 'tools';
const DEFAULT_PRICING = {
    free: false,
    freemium: false,
    paidOnly: false,
    currency: "USD" as const
};

// Tool TypeScript Interface
export interface Tool {
    name: string;
    category: "gorsel" | "metin" | "ses" | "arastirma" | "video" | "veri" | "kod";
    secondaryCategories?: Category[]; // NEW: Tools can span multiple categories
    description: string;
    url: string;
    pricing: {
        free: boolean;
        freemium: boolean;
        paidOnly: boolean;
        startingPrice?: number;
        currency: "USD";
    };
    bestFor: string[];
    strength: number;
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
 * Get all tools from KV (with auto-initialization)
 */
export async function getTools(): Promise<Tool[]> {
    // In-memory cache kontrolü
    if (toolsCache && Date.now() < toolsCache.expiry) {
        return toolsCache.data;
    }

    try {
        let tools = await kv.get<Tool[]>(KV_TOOLS_KEY);

        // Auto-initialize if empty
        if (!tools || tools.length === 0) {
            console.log('[init] No tools found in KV, initializing...');
            await initializeTools();
            tools = await kv.get<Tool[]>(KV_TOOLS_KEY);
        }

        const result = tools || BASE_TOOLS;
        toolsCache = { data: result, expiry: Date.now() + TOOLS_CACHE_TTL };
        return result;
    } catch (error) {
        console.warn('[getTools] KV unavailable, returning BASE_TOOLS. Error:', error);
        return BASE_TOOLS;
    }
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
    if (options?.pricingFilter === "free") {
        tools = tools.filter((t) => t.pricing.free || t.pricing.freemium);
    } else if (options?.pricingFilter === "paid") {
        tools = tools.filter((t) => t.pricing.paidOnly || t.pricing.freemium);
    }

    // 3) Simple scoring: strength + free/freemium bonus
    const scored = tools.map((t) => {
        let score = t.strength ?? 8;
        if (t.pricing.free) score += 0.3;
        if (t.pricing.freemium) score += 0.1;
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
    const bestFor = tool.bestFor?.map((b) => b.toLowerCase()) ?? [];

    if (keywords.length === 0 || bestFor.length === 0) return 0;

    const matches = keywords.reduce((count, keyword) => {
        return count + (bestFor.some((bf) => bf.includes(keyword)) ? 1 : 0);
    }, 0);

    return matches / Math.max(keywords.length, bestFor.length, 1);
}

function matchesPricingFilter(tool: Tool, filter?: "all" | "free" | "paid"): boolean {
    if (!filter || filter === "all") return true;
    const pricing = tool.pricing ?? DEFAULT_PRICING;
    if (filter === "free") return pricing.free || pricing.freemium;
    if (filter === "paid") return pricing.paidOnly || pricing.freemium;
    return true;
}

function matchesPricingPreference(tool: Tool, intent: ParsedIntent): boolean {
    const pricing = tool.pricing ?? DEFAULT_PRICING;
    if (intent.constraints.pricing === 'free') return pricing.free;
    if (intent.constraints.pricing === 'paid') return pricing.paidOnly || pricing.freemium;
    return true;
}

/**
 * Calculate overall tool score blending similarity, pricing alignment and inherent strength.
 */
export function scoreTool(tool: Tool, intent: ParsedIntent, filters?: ToolFilters): number {
    const pricing = tool.pricing ?? DEFAULT_PRICING;
    const strengthScore = tool.strength ?? 8;

    const similarityScore = computeKeywordSimilarity(tool, intent) * 4; // Up to ~4 bonus points

    let pricingScore = 0;
    if (intent.constraints.pricing === 'free') {
        pricingScore += pricing.free ? 2 : pricing.freemium ? 1 : -3;
    } else if (intent.constraints.pricing === 'paid') {
        pricingScore += pricing.paidOnly || pricing.freemium ? 1 : -1;
    } else if (intent.constraints.pricing === 'freemium' && pricing.freemium) {
        pricingScore += 0.5;
    }

    if (filters?.pricingFilter === 'free' && (pricing.free || pricing.freemium)) {
        pricingScore += 0.5;
    } else if (filters?.pricingFilter === 'paid' && (pricing.paidOnly || pricing.freemium)) {
        pricingScore += 0.3;
    }

    if (intent.constraints.speed === 'fast' && tool.features?.some((f) => f.toLowerCase().includes('fast'))) {
        pricingScore += 0.2;
    }

    if (intent.constraints.expertise === 'beginner' && pricing.free) {
        pricingScore += 0.2;
    }

    return strengthScore + similarityScore + pricingScore;
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
        tools = tools.filter((tool) => matchesPricingFilter(tool, options.pricingFilter));
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

    const matchingKeywords = intent.keywords.filter(k =>
        tool.bestFor.some(bf => bf.toLowerCase().includes(k.toLowerCase()))
    );
    if (matchingKeywords.length > 0) {
        reasons.push(`"${matchingKeywords[0]}" konusunda uzman`);
    }

    if (intent.constraints.pricing === 'free' && tool.pricing.free) {
        reasons.push('Ücretsiz kullanılabiliyor');
    }

    if (tool.strength > 9.5) {
        reasons.push('Sektörün en iyisi');
    } else if (tool.strength > 9) {
        reasons.push('Çok yüksek kaliteli');
    }

    if (intent.constraints.expertise === 'beginner' && tool.pricing.free) {
        reasons.push('Yeni başlayanlar için uygun');
    }

    return reasons.length > 0
        ? `Bu aracı seçtim çünkü: ${reasons.join(', ')}.`
        : `${tool.name} bu kategori için en iyi seçeneklerden biri.`;
}
