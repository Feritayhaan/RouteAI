// RouteAI Base Tools Database
// 25 güncel AI araçları (2025 Kasım)

export interface Tool {
    name: string;
    category: "gorsel" | "metin" | "ses" | "arastirma" | "video" | "veri";
    description: string;
    url: string;
    free: boolean;
    bestFor: string[];
    strength: number;
}

export const baseTools: { tools: Tool[] } = {
    tools: [
        // GÖRSEL (8 araç)
        {
            name: "Flux Ultra",
            category: "gorsel",
            description: "Black Forest Labs'ın en gerçekçi görüntü üreticisi, 2025'te lider.",
            url: "https://flux-ai.io",
            free: false,
            bestFor: ["gerçekçi fotoğraflar", "yüksek hız"],
            strength: 9.9
        },
        {
            name: "Midjourney V7",
            category: "gorsel",
            description: "Sanatsal ve stil odaklı görüntü üretimi.",
            url: "https://midjourney.com",
            free: false,
            bestFor: ["sanat", "konsept art"],
            strength: 9.7
        },
        {
            name: "Ideogram 2.0",
            category: "gorsel",
            description: "Mükemmel metin entegrasyonu için.",
            url: "https://ideogram.ai",
            free: true,
            bestFor: ["logo", "text-based"],
            strength: 9.2
        },
        {
            name: "DALL-E 4",
            category: "gorsel",
            description: "OpenAI'nin karmaşık prompt'lar için.",
            url: "https://openai.com/dall-e",
            free: false,
            bestFor: ["detaylı sahneler"],
            strength: 9.5
        },
        {
            name: "Leonardo AI Phoenix",
            category: "gorsel",
            description: "Oyun assetleri için.",
            url: "https://leonardo.ai",
            free: true,
            bestFor: ["oyun tasarımı"],
            strength: 9.0
        },
        {
            name: "Stable Diffusion 3",
            category: "gorsel",
            description: "Açık kaynak, yerel kullanım.",
            url: "https://stability.ai",
            free: true,
            bestFor: ["custom kontrol"],
            strength: 8.8
        },
        {
            name: "Adobe Firefly 3",
            category: "gorsel",
            description: "Photoshop entegrasyonlu.",
            url: "https://firefly.adobe.com",
            free: false,
            bestFor: ["profesyonel edit"],
            strength: 9.3
        },
        {
            name: "Gemini Nano Banana",
            category: "gorsel",
            description: "Multimodal, ücretsiz limit yüksek.",
            url: "https://gemini.google.com",
            free: true,
            bestFor: ["video anlama"],
            strength: 9.8
        },

        // METİN (8 araç)
        {
            name: "Gemini 2.5 Pro",
            category: "metin",
            description: "Google'un 2025 multimodal lideri.",
            url: "https://gemini.google.com",
            free: true,
            bestFor: ["uzun analiz", "çeviri"],
            strength: 9.6
        },
        {
            name: "Claude Opus 4",
            category: "metin",
            description: "Anthropic'in reasoning kralı.",
            url: "https://claude.ai",
            free: true,
            bestFor: ["kod", "resmi yazı"],
            strength: 9.8
        },
        {
            name: "ChatGPT-5",
            category: "metin",
            description: "OpenAI'nin genel amaçlı modeli.",
            url: "https://chat.openai.com",
            free: true,
            bestFor: ["sohbet", "içerik"],
            strength: 9.4
        },
        {
            name: "Grok-4",
            category: "metin",
            description: "xAI'nin güncel bilgi odaklı.",
            url: "https://grok.x.ai",
            free: true,
            bestFor: ["haber", "espri"],
            strength: 9.2
        },
        {
            name: "DeepSeek R1",
            category: "metin",
            description: "Ucuz reasoning modeli.",
            url: "https://deepseek.com",
            free: true,
            bestFor: ["matematik", "mantık"],
            strength: 9.5
        },
        {
            name: "Perplexity Deep Research",
            category: "metin",
            description: "Kaynaklı araştırma.",
            url: "https://perplexity.ai",
            free: true,
            bestFor: ["araştırma"],
            strength: 9.4
        },
        {
            name: "Jasper 2.0",
            category: "metin",
            description: "Pazarlama içeriği.",
            url: "https://jasper.ai",
            free: false,
            bestFor: ["blog", "reklam"],
            strength: 8.7
        },
        {
            name: "Grammarly AI",
            category: "metin",
            description: "Yazı düzeltme ve stil.",
            url: "https://grammarly.com",
            free: true,
            bestFor: ["edit", "stil"],
            strength: 8.9
        },

        // SES (3 araç)
        {
            name: "ElevenLabs v3",
            category: "ses",
            description: "Gerçekçi TTS ve klonlama.",
            url: "https://elevenlabs.io",
            free: true,
            bestFor: ["seslendirme", "podcast"],
            strength: 9.7
        },
        {
            name: "Suno AI v4",
            category: "ses",
            description: "Müzik üretimi.",
            url: "https://suno.com",
            free: true,
            bestFor: ["şarkı", "beste"],
            strength: 9.0
        },
        {
            name: "Murf AI 2",
            category: "ses",
            description: "Profesyonel voiceover.",
            url: "https://murf.ai",
            free: false,
            bestFor: ["video sesi"],
            strength: 9.2
        },

        // ARAŞTIRMA (3 araç)
        {
            name: "Consensus 2.0",
            category: "arastirma",
            description: "Bilimsel özetler.",
            url: "https://consensus.app",
            free: true,
            bestFor: ["makale", "tez"],
            strength: 9.1
        },
        {
            name: "SciSpace",
            category: "arastirma",
            description: "Otomatik literatür tarama.",
            url: "https://scispace.com",
            free: true,
            bestFor: ["kaynak bulma"],
            strength: 8.9
        },
        {
            name: "Elicit",
            category: "arastirma",
            description: "Akademik arama.",
            url: "https://elicit.com",
            free: false,
            bestFor: ["veri çıkarma"],
            strength: 9.0
        },

        // VİDEO (2 araç)
        {
            name: "Veo 3",
            category: "video",
            description: "Google'un sesli video üretimi.",
            url: "https://veo.google.com",
            free: false,
            bestFor: ["animasyon", "hikaye"],
            strength: 9.6
        },
        {
            name: "Runway Gen-3",
            category: "video",
            description: "Text-to-video lideri.",
            url: "https://runwayml.com",
            free: false,
            bestFor: ["kısa klipler"],
            strength: 9.4
        },

        // VERİ (1 araç)
        {
            name: "Julius AI",
            category: "veri",
            description: "Veri görselleştirme ve analiz.",
            url: "https://julius.ai",
            free: false,
            bestFor: ["chart", "trend"],
            strength: 9.0
        }
    ]
};

// Kategori bazlı araçları getir
export function getToolsByCategory(category: string): Tool[] {
    return baseTools.tools.filter(tool => tool.category === category);
}

// En yüksek strength'e sahip araçları getir
export function getTopTools(limit: number = 5): Tool[] {
    return [...baseTools.tools]
        .sort((a, b) => b.strength - a.strength)
        .slice(0, limit);
}

// Tüm araçları getir
export function getAllTools(): Tool[] {
    return baseTools.tools;
}
