// Gizli kullanıcı puanı (2026-10-15): her (görev, ürün) çifti 500 puanla başlar;
// kullanıcıların 👍/👎 oyları puanı oynatır; öneri sırası puanı yüksek olandan
// düşüğe doğrudur. Puan KULLANICIYA GÖSTERİLMEZ: istemciye giden hiçbir
// yanıtta (lib/recommendV3.ts çıktısı dahil) puan alanı yoktur.
//
// Bu dosya saf hesaptır (KV yok, test edilir). KV tarafı: lib/points/store.ts.
//
// Formül (kademeli): puan = 500 + 500 · (👍 − 👎) / (👍 + 👎 + 20)
//  - Her zaman 0–1000 arasında kalır.
//  - 20 "hayali" nötr oy gibi davranır: ilk birkaç oy puanı az oynatır, oy sayısı
//    arttıkça etki büyür. 1 👍 → 523,8; 5 👍 → 600; 20 👍 → 750; 100 👍 → 916,7.
//  - Eşit 👍 ve 👎 her zaman 500 verir.
//
// Sıralamada kullanılan puan ("yumuşak eşik"): ham puan 500'den DEAD_ZONE (25)
// puandan az uzaktaysa sıralamada 500 sayılır; yoksa yalnızca aşan kısım sayılır
// ve aralık yine 0–1000 kalsın diye ölçeklenir. Böylece tek bir kişinin tek oyu
// listeyi oynatmaz, ama ani bir sıçrama da yoktur: etki oy geldikçe sürekli artar.
// Ölü bölge oy sayısıyla kendiliğinden genişler (gereken net oy ≈ 1 + oy sayısı/20).
// Örnek: 1 👍 → 500 (etkisiz); 2 👍 → 521,53; 5 👍 → 578,95; 20 👍 → 736,84.
// Ham puan her zaman hesaplanır ve yönetici görünümünde (/api/admin/points) görünür.
//
// Not: bu puan, RouteAI Skoru'nun (lib/catalog/score.ts) yerine geçmez; eşit
// puanda sıralama RouteAI Skoru'na (ve onun eşitlik bozucularına) düşer.

export const START_POINTS = 500;
/** Puanın 500'den en fazla ne kadar uzaklaşabileceği: aralık 0–1000. */
export const MAX_SWING = 500;
/** Kademeli etki: bu kadar hayali nötr oy. Büyütmek ilk oyların etkisini azaltır. */
export const PRIOR_VOTES = 20;
/**
 * Ölü bölge: ham puan 500'den bu kadar (puan) uzaklaşmadıkça sıralamada 500
 * sayılır. Küçük bir örneklemin gürültüsü listeyi oynatmasın diye.
 */
export const DEAD_ZONE = 25;

export interface VoteCounts {
  up: number;
  down: number;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;
const clampCount = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function totalVotes(counts: VoteCounts): number {
  return clampCount(counts.up) + clampCount(counts.down);
}

/** Ham puanın 500'den sapması (yuvarlanmamış, −500…+500). */
function shiftFromVotes(counts: VoteCounts): number {
  const up = clampCount(counts.up);
  const down = clampCount(counts.down);
  return (MAX_SWING * (up - down)) / (up + down + PRIOR_VOTES);
}

/** Ham puan (0–1000). Oy yoksa tam 500. */
export function pointsFromVotes(counts: VoteCounts): number {
  return round2(START_POINTS + shiftFromVotes(counts));
}

/**
 * Sıralamada kullanılacak puan (0–1000). Ham puan 500'e DEAD_ZONE'dan yakınsa 500;
 * değilse sapmanın DEAD_ZONE'u aşan kısmı, tam aralık (±500) korunsun diye
 * 500 / (500 − DEAD_ZONE) ile ölçeklenip 500'e eklenir. Oy arttıkça sürekli artar, sıçramaz.
 */
export function rankingPoints(counts: VoteCounts | undefined): number {
  if (!counts) return START_POINTS;
  const shift = shiftFromVotes(counts);
  const beyond = Math.abs(shift) - DEAD_ZONE;
  if (beyond <= 0) return START_POINTS;
  return round2(START_POINTS + Math.sign(shift) * beyond * (MAX_SWING / (MAX_SWING - DEAD_ZONE)));
}

export interface RankCandidate<T> {
  value: T;
  /** Mevcut (puansız) sıradaki yeri; eşit puanda küçük olan öne geçer. */
  legacyIndex: number;
  /** rankingPoints sonucu. */
  points: number;
}

/** Puanı yüksek olan önde; eşit puanda mevcut sıra korunur. Girdiyi değiştirmez. */
export function rankByPoints<T>(candidates: RankCandidate<T>[]): T[] {
  return [...candidates]
    .sort((a, b) => b.points - a.points || a.legacyIndex - b.legacyIndex)
    .map((c) => c.value);
}
