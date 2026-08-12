// Canli yolun (app/api/recommend) siralama mantigi — TEK yer.
//
// Bunu ayri bir dosyaya cikarmamizin sebebi: route.ts'te hem vektor dalinda
// hem fallback dalinda ayri ayri siralama yaziliyordu ve fallback dali ham
// strength'e gore siraliyordu. 96 aracin 71'i strength 9.5 oldugu icin
// siralama pratikte JSON dosyasinin satir sirasina dusuyordu.
//
// NOT: lib/toolsService.ts'teki scoreTool bu isin ESKI kopyasi ve uretimde
// hicbir yerden cagrilmiyor. Onu bilerek birlestirmedik — o ayri bir karar.

import { Tool } from './toolsService';

/** Denetlenmemis kayit cezasi. strength birimi cinsinden. */
export const UNREVIEWED_RANK_PENALTY = 1.5;

/**
 * Arama skorunun agirligi. strength araligi ~8-10 (yayilim ~2) oldugu icin
 * 10'luk agirlik aramayi baskin sinyal yapar: alakali bir arac, kendisinden
 * daha guclu ama alakasiz bir araci gecer.
 */
export const SEARCH_WEIGHT = 10;

export interface RankOptions {
    /**
     * Arac adi -> ham arama skoru. Vektor dalinda cosine benzerligi,
     * keyword fallback'inde eslesen kelime sayisi. Olceklerin ikisi de
     * sorgu icinde kendi maksimumuna normalize edilir.
     */
    searchScores?: Map<string, number>;
}

/**
 * Siralama sirasi (route.ts'in dort dalinda da ayni):
 *   1) arama skoru (varsa, normalize edilmis)
 *   2) denetlenmemis cezasi
 *   3) strength
 *   4) lastUpdated — yeni olan onde (esitlik bozucu)
 *   5) isim — tam determinizm icin; aksi halde esitlik dosya satir sirasina duser
 *
 * intent parametresi ALMIYOR: yukaridaki dort kriterin hicbiri intent'e
 * bagli degil. Fiyat/kategori kisitlari siralama degil ELEME isi ve route.ts
 * icinde filtre olarak uygulaniyor; burada tekrar puanlamak cift sayim olurdu.
 */
export function rankTools(tools: Tool[], options: RankOptions = {}): Tool[] {
    const { searchScores } = options;

    let maxScore = 0;
    if (searchScores) {
        for (const tool of tools) {
            const score = searchScores.get(tool.name) ?? 0;
            if (score > maxScore) maxScore = score;
        }
    }

    const compositeScore = (tool: Tool): number => {
        const relevance = maxScore > 0 ? (searchScores!.get(tool.name) ?? 0) / maxScore : 0;
        const penalty = tool.reviewStatus === 'unreviewed' ? UNREVIEWED_RANK_PENALTY : 0;
        return relevance * SEARCH_WEIGHT + (tool.strength ?? 8) - penalty;
    };

    const updatedAt = (tool: Tool): number => {
        const parsed = tool.lastUpdated ? Date.parse(tool.lastUpdated) : NaN;
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    return [...tools].sort((a, b) => {
        const byScore = compositeScore(b) - compositeScore(a);
        if (Math.abs(byScore) > 1e-9) return byScore;

        const byDate = updatedAt(b) - updatedAt(a);
        if (byDate !== 0) return byDate;

        return a.name.localeCompare(b.name, 'tr');
    });
}
