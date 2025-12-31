// Keyword mapping for category detection

export const keywords = {
    gorsel: ["görsel", "resim", "fotoğraf", "logo", "image", "art", "çiz", "tasarım", "design", "picture", "photo", "grafik"],
    metin: ["yazı", "metin", "blog", "yazma", "content", "writing", "makale", "article", "text", "yaz", "içerik", "copy"],
    ses: ["müzik", "ses", "podcast", "voice", "audio", "music", "sound", "voice-over", "voiceover", "seslendirme"],
    arastirma: ["akademik", "makale", "tez", "research", "paper", "bilimsel", "araştırma", "kaynak", "literature"],
    video: ["video", "animasyon", "film", "clip", "animation", "movie", "klip"],
    veri: ["veri", "analiz", "data", "excel", "chart", "grafik", "istatistik", "statistics", "dashboard"]
};

// Detect category from user query
export function detectCategory(query) {
    const lowerQuery = query.toLowerCase();

    for (const [category, keywordList] of Object.entries(keywords)) {
        for (const keyword of keywordList) {
            if (lowerQuery.includes(keyword)) {
                return category;
            }
        }
    }

    return null; // No category detected
}

// Get all keywords for a category
export function getKeywordsForCategory(category) {
    return keywords[category] || [];
}
