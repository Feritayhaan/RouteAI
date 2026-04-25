// Keyword mapping for category detection

export type Category = "gorsel" | "metin" | "ses" | "arastirma" | "video" | "veri" | "kod";

export const keywords: Record<Category, string[]> = {
    gorsel: ["görsel", "resim", "fotoğraf", "logo", "image", "art", "çiz", "tasarım", "design", "picture", "photo", "grafik"],
    metin: ["yazı", "metin", "blog", "yazma", "content", "writing", "makale", "article", "text", "yaz", "içerik", "copy"],
    ses: ["müzik", "ses", "podcast", "voice", "audio", "music", "sound", "voice-over", "voiceover", "seslendirme"],
    arastirma: ["akademik", "makale", "tez", "research", "paper", "bilimsel", "araştırma", "kaynak", "literature"],
    video: ["video", "animasyon", "film", "clip", "animation", "movie", "klip"],
    veri: ["veri", "analiz", "data", "excel", "chart", "grafik", "istatistik", "statistics", "dashboard"],
    kod: ["kod", "code", "programlama", "coding", "yazılım", "software", "geliştirme", "development", "python", "javascript", "react", "github", "api", "function", "algoritma"]
};


// Detect category from user query
export function detectCategory(query: string): Category | null {
    const normalizedQuery = query.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [category, keywordList] of Object.entries(keywords)) {
        let count = 0;
        for (const keyword of keywordList) {
            if (normalizedQuery.includes(keyword)) {
                count++;
            }
        }
        if (count > 0) {
            scores[category] = count;
        }
    }

    if (Object.keys(scores).length === 0) return null;

    // En çok eşleşen kategoriyi döndür
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best[0] as Category;
}

// Get all keywords for a category
export function getKeywordsForCategory(category: Category): string[] {
    return keywords[category] || [];
}
