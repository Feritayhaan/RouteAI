// RouteAI Tools Service - Vercel KV Storage
// Manages AI tools in Upstash Redis with auto-initialization

import { kv } from './kv';

const KV_TOOLS_KEY = 'tools';

// Tool TypeScript Interface
export interface Tool {
    name: string;
    category: "gorsel" | "metin" | "ses" | "arastirma" | "video" | "veri" | "kod";
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
    demoUrl?: string;
    features?: string[];
    lastUpdated?: string;
}

// Base Tools - 26 AI Tools (November 2025)
export const BASE_TOOLS: Tool[] = [
    // GORSEL ARACLAR (10)
    {
        name: "Midjourney v7",
        category: "gorsel",
        description: "Sinematik kalitede sanat ve gorsel uretimi icin yapay zeka",
        url: "https://www.midjourney.com",
        pricing: {
            free: false,
            freemium: false,
            paidOnly: true,
            startingPrice: 10,
            currency: "USD"
        },
        bestFor: ["artistic images", "cinematic visuals", "concept art", "poster design"],
        strength: 9.8,
        features: ["Draft mode", "voice control", "Discord integration", "commercial rights"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "ChatGPT (GPT-4o Image)",
        category: "gorsel",
        description: "Metin dogrulugu ve UI tasarimi icin en iyi yapay zeka",
        url: "https://chat.openai.com",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: "USD"
        },
        bestFor: ["UI wireframes", "diagrams", "text rendering", "signage"],
        strength: 9.7,
        features: ["Perfect text accuracy", "instruction following", "multi-step editing"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "DALL-E 3",
        category: "gorsel",
        description: "ChatGPT ile entegre fotogercekci gorsel uretimi",
        url: "https://openai.com/dall-e-3",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: "USD"
        },
        bestFor: ["photorealistic images", "precise prompts", "text integration"],
        strength: 9.5,
        features: ["Unlimited generation", "commercial rights", "aspect ratios", "GPT-4 access"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Google Imagen 4",
        category: "gorsel",
        description: "Hizli ve gercekci gorsel uretimi icin Google AI",
        url: "https://deepmind.google/technologies/imagen-4/",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 0.035,
            currency: "USD"
        },
        bestFor: ["photorealism", "fast generation", "Google ecosystem"],
        strength: 9.4,
        features: ["2K resolution", "SynthID watermarking", "multi-aspect ratio"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Adobe Firefly Image 4",
        category: "gorsel",
        description: "Marka guvenli AI gorsel duzenleme ve olusturma",
        url: "https://firefly.adobe.com",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 9.99,
            currency: "USD"
        },
        bestFor: ["brand-safe editing", "commercial use", "Adobe integration"],
        strength: 9.2,
        features: ["C2PA credentials", "IP indemnity", "4000 credits/month", "legal training data"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Stable Diffusion XL",
        category: "gorsel",
        description: "Acik kaynak, ozellestirilebilir gorsel uretimi",
        url: "https://stability.ai",
        pricing: {
            free: true,
            freemium: false,
            paidOnly: false,
            startingPrice: 0,
            currency: "USD"
        },
        bestFor: ["high-volume generation", "customization", "offline use"],
        strength: 9.0,
        features: ["Open source", "unlimited use", "ControlNet", "LoRA training", "1024x1024"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Flux.1 Pro",
        category: "gorsel",
        description: "Hizli ve yuksek kaliteli gorsel uretimi",
        url: "https://flux-ai.io",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 7.99,
            currency: "USD"
        },
        bestFor: ["fast generation", "high quality", "batch processing"],
        strength: 8.9,
        features: ["$0.04/image API", "Kontext editing", "10x faster", "commercial rights"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Leonardo AI",
        category: "gorsel",
        description: "Takimlar icin uygun fiyatli AI gorsel olusturma",
        url: "https://leonardo.ai",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 12,
            currency: "USD"
        },
        bestFor: ["team collaboration", "custom models", "game assets"],
        strength: 8.8,
        features: ["8500 tokens/month", "private generation", "10 custom models", "canvas"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Ideogram 2.0",
        category: "gorsel",
        description: "Mukemmel metin render ozellikli AI gorsel araci",
        url: "https://ideogram.ai",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 7,
            currency: "USD"
        },
        bestFor: ["text rendering", "posters", "typography", "logos"],
        strength: 8.7,
        features: ["Character consistency", "image upload", "400 priority credits", "batch generation"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Canva AI (Magic Studio)",
        category: "gorsel",
        description: "25+ AI ozellikli tasarim ve duzenleme platformu",
        url: "https://www.canva.com",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 10,
            currency: "USD"
        },
        bestFor: ["social media", "presentations", "branding", "marketing"],
        strength: 8.5,
        features: ["Magic Design", "140M+ assets", "1TB storage", "Brand Kit", "Background Remover"],
        lastUpdated: "2025-11-28"
    },

    // METIN ARACLARI (5)
    {
        name: "ChatGPT (GPT-5)",
        category: "metin",
        description: "En guclu cok amacli AI sohbet ve yazma asistani",
        url: "https://chat.openai.com",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: "USD"
        },
        bestFor: ["content writing", "research", "coding", "creative writing", "analysis"],
        strength: 9.9,
        features: ["GPT-5", "image generation", "web browsing", "custom GPTs", "voice mode", "data analysis"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Claude AI (Claude 4)",
        category: "metin",
        description: "Uzun metin analizi ve yazma icin ustun AI",
        url: "https://claude.ai",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: "USD"
        },
        bestFor: ["long documents", "analysis", "coding", "research", "safety"],
        strength: 9.7,
        features: ["200K context", "Projects", "Artifacts", "Constitutional AI", "document analysis"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Gemini 2.5 Pro",
        category: "metin",
        description: "Google'in multimodal AI platformu",
        url: "https://gemini.google.com",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 19.99,
            currency: "USD"
        },
        bestFor: ["multimodal tasks", "Google integration", "research", "code"],
        strength: 9.5,
        features: ["1M token context", "Deep Research", "NotebookLM", "Workspace integration"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Jasper AI",
        category: "metin",
        description: "Pazarlama icerigi icin ozellesmis AI yazma araci",
        url: "https://www.jasper.ai",
        pricing: {
            free: false,
            freemium: false,
            paidOnly: true,
            startingPrice: 39,
            currency: "USD"
        },
        bestFor: ["marketing copy", "SEO content", "brand voice", "campaigns"],
        strength: 9.0,
        features: ["Brand Voice", "50+ templates", "SEO mode", "team collaboration", "API"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Copy.ai",
        category: "metin",
        description: "Pazarlama ekipleri icin AI icerik otomasyonu",
        url: "https://www.copy.ai",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 29,
            currency: "USD"
        },
        bestFor: ["ad copy", "sales emails", "GTM workflows", "automation"],
        strength: 8.8,
        features: ["Workflows", "5 seats", "unlimited chat", "500 workflow credits"],
        lastUpdated: "2025-11-28"
    },

    // KOD ARACLARI (3)
    {
        name: "GitHub Copilot",
        category: "kod",
        description: "Microsoft ve OpenAI'nin AI kod tamamlama araci",
        url: "https://github.com/features/copilot",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 10,
            currency: "USD"
        },
        bestFor: ["code completion", "function generation", "test cases", "documentation"],
        strength: 9.7,
        features: ["Real-time suggestions", "multi-IDE support", "chat feature", "GPT-4"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Cursor",
        category: "kod",
        description: "VS Code tabanli gelismis AI kod editoru",
        url: "https://cursor.com",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: "USD"
        },
        bestFor: ["multi-file edits", "codebase queries", "AI agent mode"],
        strength: 9.6,
        features: ["GPT-4 & Claude integration", "agent mode", ".cursorrules", "$20 API credits"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Claude Code (Anthropic)",
        category: "kod",
        description: "Terminal tabanli derin kod analizi araci",
        url: "https://claude.ai",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: "USD"
        },
        bestFor: ["terminal coding", "code explanation", "documentation generation"],
        strength: 9.5,
        features: ["Multi-file editing", "terminal commands", "deep codebase understanding"],
        lastUpdated: "2025-11-28"
    },

    // SES ARACLARI (2)
    {
        name: "ElevenLabs",
        category: "ses",
        description: "En gercekci AI ses klonlama ve TTS platformu",
        url: "https://elevenlabs.io",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 5,
            currency: "USD"
        },
        bestFor: ["voice cloning", "audiobooks", "dubbing", "voice agents"],
        strength: 9.8,
        features: ["10K+ voices", "70+ languages", "voice cloning", "API", "music generation"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Murf.ai",
        category: "ses",
        description: "Profesyonel AI voiceover platformu",
        url: "https://murf.ai",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 23,
            currency: "USD"
        },
        bestFor: ["voiceovers", "presentations", "e-learning", "ads"],
        strength: 9.2,
        features: ["200+ voices", "pitch/speed control", "dubbing", "voice cloning", "text-to-speech"],
        lastUpdated: "2025-11-28"
    },

    // VIDEO ARACLARI (2)
    {
        name: "Sora 2 (OpenAI)",
        category: "video",
        description: "En gelismis AI video uretim modeli",
        url: "https://openai.com/sora",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: "USD"
        },
        bestFor: ["cinematic videos", "storytelling", "marketing", "filmmaking"],
        strength: 9.9,
        features: ["20s videos", "1080p", "spatial audio", "draft mode", "voice control"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Google Veo 3",
        category: "video",
        description: "Hizli ve yuksek kaliteli AI video uretimi",
        url: "https://deepmind.google/technologies/veo/",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 19.99,
            currency: "USD"
        },
        bestFor: ["fast generation", "high quality", "Google integration"],
        strength: 9.7,
        features: ["$0.15-0.40/second", "Veo 3 Fast", "audio synthesis"],
        lastUpdated: "2025-11-28"
    },

    // ARASTIRMA ARACLARI (2)
    {
        name: "Perplexity AI",
        category: "arastirma",
        description: "AI destekli arama ve arastirma motoru",
        url: "https://www.perplexity.ai",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: "USD"
        },
        bestFor: ["research", "fact-checking", "cited answers", "deep research"],
        strength: 9.5,
        features: ["Real-time search", "citations", "GPT-4 access", "Pro Search", "unlimited queries"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Elicit AI",
        category: "arastirma",
        description: "Akademik makale analizi ve literatur taramasi",
        url: "https://elicit.com",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 10,
            currency: "USD"
        },
        bestFor: ["literature review", "data extraction", "systematic reviews"],
        strength: 9.2,
        features: ["125M+ papers", "2400 extractions/year", "20 columns", "research alerts"],
        lastUpdated: "2025-11-28"
    },

    // VERI ARACLARI (2)
    {
        name: "Tableau",
        category: "veri",
        description: "Endustri standardi veri gorsellestirme platformu",
        url: "https://www.tableau.com",
        pricing: {
            free: false,
            freemium: false,
            paidOnly: true,
            startingPrice: 15,
            currency: "USD"
        },
        bestFor: ["enterprise BI", "data visualization", "dashboards", "analytics"],
        strength: 9.6,
        features: ["Interactive dashboards", "Einstein AI", "70+ data sources", "mobile analytics"],
        lastUpdated: "2025-11-28"
    },
    {
        name: "Microsoft Power BI",
        category: "veri",
        description: "Microsoft ekosistemi icin AI destekli BI araci",
        url: "https://powerbi.microsoft.com",
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 14,
            currency: "USD"
        },
        bestFor: ["Microsoft users", "business intelligence", "corporate reporting"],
        strength: 9.5,
        features: ["Copilot AI", "natural language Q&A", "forecasting", "Excel integration"],
        lastUpdated: "2025-11-28"
    }
];

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
    try {
        let tools = await kv.get<Tool[]>(KV_TOOLS_KEY);

        // Auto-initialize if empty
        if (!tools || tools.length === 0) {
            console.log('[init] No tools found in KV, initializing...');
            await initializeTools();
            tools = await kv.get<Tool[]>(KV_TOOLS_KEY);
        }

        return tools || BASE_TOOLS; // Fallback to BASE_TOOLS if KV fails
    } catch (error) {
        console.warn('[getTools] KV unavailable, returning BASE_TOOLS. Error:', error);
        return BASE_TOOLS;
    }
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
