// Turkce metin normalizasyonu — eslestirmenin TEK yeri.
//
// Sorun: eslestirme toLowerCase() ile yapiliyordu. Turk kullanicilarin cogu
// diakritiksiz yazar ("dugun davetiyesi"), veride ise diakritikli durur
// ("düğün davetiyesi") — hicbir zaman eslesmezdi.
//
// Ayrica toLowerCase() Turkce'de yanlis: 'I' -> 'i' verir, dogrusu 'ı';
// 'İ' -> 'i̇' (birlesik nokta) verir. Bu yuzden iki harfi once elle cevirip
// sonra locale-duyarli kucultme yapiyoruz. Elle cevirme ayni zamanda Edge
// runtime'da ICU verisi eksik olsa bile sonucun sabit kalmasini garantiler.
//
// KURAL: karsilastirmanin IKI tarafina da uygula — sorgu VE arac metni.

const FOLD: Record<string, string> = {
    'ç': 'c',
    'ğ': 'g',
    'ı': 'i',
    'ö': 'o',
    'ş': 's',
    'ü': 'u',
    // Turkce'de duzeltme isaretli sesliler (kâr, âlem, îman) de sadelessin
    'â': 'a',
    'î': 'i',
    'û': 'u',
};

export function normalizeTr(s: string): string {
    if (!s) return '';

    return s
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .toLocaleLowerCase('tr')
        .replace(/[çğıöşüâîû]/g, (ch) => FOLD[ch] ?? ch)
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Metni normalize edip kelimelere böler. Harf ve rakam dışındaki her şey
 * (boşluk, noktalama, tire, kesme işareti) ayırıcıdır:
 * "Beautiful.ai" -> ["beautiful", "ai"], "pitch deck'i" -> ["pitch", "deck", "i"].
 *
 * Kelime sınırıyla eşleştirme yapan her yer bunu kullanır; substring
 * eşleştirmesi "freelancer" içinde "reel", "startup" içinde "art" buluyordu.
 */
export function tokenizeTr(s: string): string[] {
    return normalizeTr(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
