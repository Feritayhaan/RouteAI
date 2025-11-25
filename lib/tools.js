// RouteAI Base Tools Database
// 25+ güncel AI araçları (2025 Kasım) - Genişletilmiş versiyon

export const baseTools = {
    tools: [
        // GÖRSEL (10 araç) - Yeni eklemeler: Imagen 3, Reve Image
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
        {
            name: "Google Imagen 3",
            category: "gorsel",
            description: "Ücretsiz gerçekçi görüntü üretimi, prompt uyumu yüksek.",
            url: "https://deepmind.google/technologies/imagen/",
            free: true,
            bestFor: ["fotorealizm", "hızlı prototip"],
            strength: 9.4
        },
        {
            name: "Reve Image",
            category: "gorsel",
            description: "Yeni nesil açık kaynak model, detaylı ve çeşitli çıktılar.",
            url: "https://reve-image.ai",
            free: true,
            bestFor: ["stilizasyon", "karakter tasarımı"],
            strength: 9.6
        },

        // METİN (12 araç) - Yeni eklemeler: Qwen 2.5, Kimi K2, Mistral Nemo, Llama 3.1
        {
            name: "Gemini 3 Pro",
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
            description: "Ücretsiz reasoning modeli, matematik ve mantıkta güçlü.",
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
        {
            name: "Qwen 2.5",
            category: "metin",
            description: "Alibaba'nın açık kaynak multilingual modeli, kod ve reasoning'de üstün.",
            url: "https://qwen.alibaba.com",
            free: true,
            bestFor: ["çok dilli", "kod üretimi"],
            strength: 9.7
        },
        {
            name: "Kimi K2",
            category: "metin",
            description: "Moonshot AI'nin ücretsiz reasoning odaklı modeli, uzun bağlamlar için ideal.",
            url: "https://kimi.moonshot.cn",
            free: true,
            bestFor: ["uzun metinler", "araştırma"],
            strength: 9.3
        },
        {
            name: "Mistral Nemo",
            category: "metin",
            description: "Açık kaynak, hızlı ve verimli metin üretimi.",
            url: "https://mistral.ai",
            free: true,
            bestFor: ["hızlı yanıt", "geliştiriciler"],
            strength: 9.1
        },
        {
            name: "Llama 3.1",
            category: "metin",
            description: "Meta'nın ücretsiz açık kaynak modeli, genel amaçlı kullanım.",
            url: "https://llama.meta.com",
            free: true,
            bestFor: ["özelleştirme", "yerel kurulum"],
            strength: 9.0
        },

        // SES (5 araç) - Yeni eklemeler: Descript, Auphonic
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
        {
            name: "Descript Overdub",
            category: "ses",
            description: "Metin tabanlı ses düzenleme ve klonlama.",
            url: "https://descript.com",
            free: true,
            bestFor: ["podcast edit", "ses onarımı"],
            strength: 9.1
        },
        {
            name: "Auphonic",
            category: "ses",
            description: "Otomatik ses iyileştirme ve gürültü azaltma.",
            url: "https://auphonic.com",
            free: true,
            bestFor: ["ses temizleme", "otomatik seviye"],
            strength: 8.8
        },

        // ARAŞTIRMA (5 araç) - Yeni eklemeler: Elicit, Scite
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
            description: "Akademik arama ve veri çıkarma.",
            url: "https://elicit.com",
            free: false,
            bestFor: ["veri çıkarma", "sistematik inceleme"],
            strength: 9.0
        },
        {
            name: "Scite",
            category: "arastirma",
            description: "Alıntı analizi ve akıllı referanslar.",
            url: "https://scite.ai",
            free: true,
            bestFor: ["alıntı doğrulama", "akademik yazı"],
            strength: 9.2
        },
        {
            name: "Paperguide",
            category: "arastirma",
            description: "All-in-one literatür ve yazı asistanı.",
            url: "https://paperguide.ai",
            free: true,
            bestFor: ["literatür tarama", "yazı sentezi"],
            strength: 9.3
        },

        // VİDEO (4 araç) - Yeni eklemeler: OpenAI Sora
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
        {
            name: "OpenAI Sora",
            category: "video",
            description: "Yüksek kaliteli text-to-video üretimi.",
            url: "https://openai.com/sora",
            free: false,
            bestFor: ["gerçekçi sahneler", "hikaye anlatımı"],
            strength: 9.7
        },
        {
            name: "Lumen5",
            category: "video",
            description: "Metin tabanlı video oluşturma, ücretsiz temel özellikler.",
            url: "https://lumen5.com",
            free: true,
            bestFor: ["sosyal medya", "pazarlama"],
            strength: 8.7
        },

        // VERİ (3 araç) - Yeni eklemeler: Powerdrill, Polymer
        {
            name: "Julius AI",
            category: "veri",
            description: "Veri görselleştirme ve analiz.",
            url: "https://julius.ai",
            free: false,
            bestFor: ["chart", "trend"],
            strength: 9.0
        },
        {
            name: "Powerdrill",
            category: "veri",
            description: "AI destekli veri analizi ve görselleştirme.",
            url: "https://powerdrill.ai",
            free: true,
            bestFor: ["otomatik içgörü", "büyük veri"],
            strength: 9.1
        },
        {
            name: "Polymer",
            category: "veri",
            description: "Veri setleri için hızlı analiz ve dashboard.",
            url: "https://www.polymersearch.com",
            free: true,
            bestFor: ["iş zekası", "hızlı rapor"],
            strength: 8.9
        }
    ]
};

// Kategori bazlı araçları getir
export function getToolsByCategory(category) {
    return baseTools.tools.filter(tool => tool.category === category);
}

// En yüksek strength'e sahip araçları getir
export function getTopTools(limit = 5) {
    return [...baseTools.tools]
        .sort((a, b) => b.strength - a.strength)
        .slice(0, limit);
}

// Tüm araçları getir
export function getAllTools() {
    return baseTools.tools;
}