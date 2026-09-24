// Keyword mapping for category detection

import { normalizeTr, tokenizeTr } from "./text";

export type Category = "gorsel" | "metin" | "ses" | "arastirma" | "video" | "veri" | "kod";

export const keywords: Record<Category, string[]> = {
    gorsel: ["resim", "görsel", "fotoğraf", "image", "photo", "logo", "illüstrasyon", "poster", "banner", "tasarım yap", "çiz", "draw", "art", "picture", "amblem"],
    metin: [
        "yazı", "metin", "blog", "yazma", "content", "writing", "makale", "article", "text", "yaz", "içerik", "copy",
        // Sunum araçları (Gamma, Beautiful.ai, Tome) metin kategorisinde:
        // metin prompt'undan slayt içeriği/döküman üretiyorlar.
        "sunum", "sunu", "slayt", "slide", "presentation", "pitch deck", "deck", "powerpoint"
    ],
    ses: ["müzik", "ses", "podcast", "voice", "audio", "music", "sound", "voice-over", "voiceover", "seslendirme"],
    arastirma: ["akademik", "tez", "research", "paper", "bilimsel", "araştırma", "kaynak", "literature"],
    video: [
        "video", "film", "animasyon", "animation", "klip", "clip", "movie",
        "reel", "shorts", "video üret", "video yap", "video oluştur",
        "video çek", "video düzenle", "text to video", "metinden video", "hareketli"
    ],
    veri: ["veri", "analiz", "data", "excel", "chart", "istatistik", "statistics", "dashboard"],
    kod: ["kod", "code", "programlama", "coding", "yazılım", "software", "geliştirme", "development", "python", "javascript", "react", "github", "api", "function", "algoritma"]
};

// Categories that should win ties / dominate when their core keyword appears.
// "video" must always beat "gorsel" if the word "video" is present.
const CATEGORY_PRIORITY: Category[] = ["video", "ses", "kod", "veri", "arastirma", "metin", "gorsel"];

// Önek olarak eşleşince yaygın kelimeleri yakalayan anahtarlar: bunlar sadece
// TAM kelime olarak sayılır. "art" önek olsaydı "artık", "artış", "article",
// "artificial" gorsel sayılırdı.
const WHOLE_WORD_ONLY = new Set(["art"]);

/**
 * Anahtar kelime sorgunun ardışık kelimeleriyle eşleşiyor mu?
 *
 * Eşleşme her zaman bir kelimenin BAŞINDAN başlar, kelime içinden asla:
 * "freelancer" video'yu ("reel") ya da "startup" gorsel'i ("art") tetiklemez.
 * Kelimenin sonu serbesttir, çünkü Türkçe ek alır: "videosu" -> "video",
 * "kodumda" -> "kod", "reels" -> "reel". Çok kelimeli anahtarlar sıralı kelime
 * dizisi olarak aranır: "pitch deck" iki komşu kelimedir.
 */
function matchesKeyword(queryWords: string[], keywordWords: string[], wholeWord: boolean): boolean {
    for (let start = 0; start + keywordWords.length <= queryWords.length; start++) {
        const matched = keywordWords.every((kw, i) => {
            const word = queryWords[start + i];
            return wholeWord ? word === kw : word.startsWith(kw);
        });
        if (matched) return true;
    }
    return false;
}

// Detect category from user query
export function detectCategory(query: string): Category | null {
    // Diakritik-duyarsiz: "gorsel" yazan da "görsel" yazan da ayni kategoriye dussun.
    const normalizedQuery = normalizeTr(query);
    const queryWords = tokenizeTr(query);
    const scores: Record<string, number> = {};

    for (const [category, keywordList] of Object.entries(keywords)) {
        let count = 0;
        for (const keyword of keywordList) {
            const keywordWords = tokenizeTr(keyword);
            if (matchesKeyword(queryWords, keywordWords, WHOLE_WORD_ONLY.has(keywordWords.join(" ")))) {
                count++;
            }
        }
        if (count > 0) {
            scores[category] = count;
        }
    }

    if (Object.keys(scores).length === 0) return null;

    // HARD RULE: "video" kelimesi geçiyorsa ASLA gorsel döndürme.
    // Video kategorisi varsa öncelikli kazansın.
    if (/\bvideo\b/i.test(normalizedQuery) || scores["video"]) {
        if (scores["video"]) {
            // video kategorisi direkt kazanır (gorsel ile çakışmayı önler)
            return "video";
        }
    }

    // Skor sıralaması — eşitlik durumunda CATEGORY_PRIORITY'ye göre kır.
    const best = Object.entries(scores).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return CATEGORY_PRIORITY.indexOf(a[0] as Category) - CATEGORY_PRIORITY.indexOf(b[0] as Category);
    })[0];
    return best[0] as Category;
}

// Get all keywords for a category
export function getKeywordsForCategory(category: Category): string[] {
    return keywords[category] || [];
}
