// RouteAI Skoru ağırlıkları — docs/ROADMAP-v2.md "RouteAI Skoru" bölümünün
// koddaki TEK karşılığı. Değiştirme yetkisi Ferit'te; değişiklik ROADMAP'e
// not edilir.
//
// q = (K_BENCHMARK*B + K_EXPERT*E + Σ w*y) / (K_BENCHMARK + K_EXPERT + Σ w)
// B yoksa K_BENCHMARK, E yoksa K_EXPERT paydaya girmez (0 sayılır).

/** Benchmark (LMArena / AA yüzdelik dilimi) = 10 gerçek iş sonucu değerinde ön bilgi. */
export const K_BENCHMARK = 10;

/** Uzman rubriği = 5 iş sonucu değerinde: bilinçli ve brifli bir deneme, ama tek kişi. */
export const K_EXPERT = 5;

/** İş sonucu ("işini gördü mü?"): evet 1, kısmen 0.5, hayır 0. En güçlü kendi sinyalimiz. */
export const W_OUTCOME = 1.0;
export const OUTCOME_Y = { yes: 1, partial: 0.5, no: 0 } as const;

/** Karşılaştırma (iki ürünü de deneyen kullanıcı): kazanan 1, kaybeden 0. Göreli bilgi, yarım ağırlık. */
export const W_COMPARISON = 0.5;

/** Öneri oyu (beğendim/beğenmedim): kullanmadan verilebildiği için en zayıf sinyal. */
export const W_VOTE = 0.3;

/** Güven eşikleri: kendi gözlem ağırlığı (ownN) ve tazelik. */
export const HIGH_OWN_N = 30;
export const MEDIUM_OWN_N = 10;
export const FRESH_DAYS = 30;

/** B ve E yoksa, en az bu kadar kendi gözlem ağırlığı olmadan ürün önerilmez. */
export const MIN_OWN_N_AS_EVIDENCE = 3;

/** Yeni başlayan kullanıcı için rubrikteki "ease" en fazla bu kadar sıralama anahtarını oynatır (q değişmez). */
export const BEGINNER_EASE_MAX_ADJUSTMENT = 0.05;

export interface Rubric {
  quality: number;
  ease: number;
  value: number;
  speed: number;
}

/**
 * Uzman rubriği (1–5) -> E (0–1). Kalite baskın; hız en az önemli.
 * (quality*0.5 + ease*0.2 + value*0.2 + speed*0.1 - 1) / 4 — kayan nokta
 * hatası olmasın diye tam sayılarla: (5q + 2e + 2v + s - 10) / 40.
 */
export function rubricToE(r: Rubric): number {
  return (5 * r.quality + 2 * r.ease + 2 * r.value + r.speed - 10) / 40;
}
