// Cümle kanıtı — "anahtar kelime bu cümleyi gerçekten açıklıyor mu?" sorusunun saf (ağsız, LLM'siz) cevabı.
//
// Sorun (2026-10-19): kural katmanı (taskClassifier.scoreTasks) cümledeki anahtar kelimeleri sayar; en iyi görev
// ikinciyi 1 puan geçerse LLM'e HİÇ inmeden o görevi seçer. Doğal bir cümlede tek bir yan kelime kararı verdi:
//   "sözleri bizim hikayemizi anlatan bir parça yaptırmak istiyorum"  -> "hikaye" -> Uzun metin yazımı   (müzik istiyor)
//   "faturalarımı toplayarak ay sonu harcamamı çıkarmak istiyorum"    -> "fatura" -> Belge ve şablon    (muhasebe istiyor)
//   "Excel'den çektiğim rakamlarla canlı bir ekran yapmak istiyorum"  -> "excel"  -> Tablo analizi      (dashboard istiyor)
// Geliştirme setindeki (evals/sentences.jsonl, split=dev) kural cevaplarının yarısı (9/18) böyle yanlıştı.
//
// Çözüm: kural katmanı yalnızca eşleşen görev CÜMLENİN ÖZÜNÜ açıklıyorsa tek başına karar verir; değilse cümleyi
// bütün olarak okuyan LLM'e bırakır (LLM yoksa "şunu mu demek istedin?" sorulur). "Açıklıyor" şu iki durumdan biri:
//   - görevin EN AZ İKİ bağımsız anahtar kelimesi cümlede geçiyor (iki ayrı işaret aynı işi gösteriyor; birbirini
//     içeren "logo yap" + "logo" tek sayılır), ya da
//   - görevin açıklayamadığı anlamlı kelime sayısı en çok RULE_MAX_UNEXPLAINED. Bir kelimeyi görev şunlardan biriyle
//     açıklar: eşleşen anahtar kelime ifadeleri ya da görevin kendi sözcük dağarcığı (anahtar kelimeler, etiket, aktif
//     ürün adları ve açıklamaları; lib/intent/understanding.ts taskSupport). Yan kelimenin görevi cümlenin geri
//     kalanını açıklayamaz: "hikaye" Uzun metin yazımı'nın dağarcığında var, ama "düğün, parça, yaptırmak..." yok.
// Anlamlı kelime: understanding.ts contentWords (dolgu, genel fiil ve kısa kelimeler çıkarılmış).
//
// Eşik, geliştirme setinde ve golden sette ölçülerek seçildi (docs/ROADMAP-v2.md, "Cümle anlama"). Kapatma anahtarı:
// SENTENCE_GATE=off iken bu kapı yoktur (eski davranış: tek anahtar kelime yeter).

import { hasTerm, normalizeTr } from '../text';
import type { Task } from '../catalog/schema';
import { contentWords, taskSupport, wordMatches } from './understanding';

type Catalog = Parameters<typeof taskSupport>[2];

/** Kural kararı için, görevin açıklayamadığı anlamlı kelime sayısının üst sınırı. */
export const RULE_MAX_UNEXPLAINED = 3;
/** Anahtar kelime sayısı bu kadar ya da fazlaysa cümle uzun da olsa kural karar verir (bağımsız işaretler). */
export const RULE_MIN_INDEPENDENT_HITS = 2;

/** Kapatma anahtarı: SENTENCE_GATE=off iken kural katmanı eskisi gibi tek anahtar kelimeyle karar verir. */
export function sentenceGateEnabled(): boolean {
  return process.env.SENTENCE_GATE !== 'off';
}

export interface RuleEvidence {
  /** Görevin cümlede geçen anahtar kelimeleri (tr + en, tekrarsız). */
  hits: string[];
  /** hits içinden, başka bir eşleşmenin parçası olmayanlar: "logo yap" ve "logo" aynı işaret sayılır (tek). */
  independentHits: string[];
  /** Görevin (anahtar kelimeleri ve sözcük dağarcığıyla) açıklayamadığı anlamlı sorgu kelimeleri. */
  unexplained: string[];
  /** Kural tek başına karar verebilir mi? (kapı kapalıysa hep true) */
  explains: boolean;
}

/**
 * Bir görevin anahtar kelime eşleşmesi cümleyi açıklıyor mu? Saf fonksiyon: ağ, LLM ve KV yok.
 * `hits` boşsa (görev hiç eşleşmedi) açıklanamayan, görevin dağarcığında geçmeyen anlamlı kelimelerdir.
 */
export function ruleEvidence(query: string, task: Pick<Task, 'id' | 'keywords'>, catalog: Catalog): RuleEvidence {
  const hits = [...new Set([...task.keywords.tr, ...task.keywords.en])].filter((k) => hasTerm(query, k));
  // "logo yap" eşleşince "logo" da eşleşir: aynı kelimenin iki yazılışı iki bağımsız işaret değildir.
  const folded = hits.map((h) => normalizeTr(h));
  const independentHits = hits.filter((_, i) => !folded.some((other, j) => j !== i && other.length > folded[i].length && other.includes(folded[i])));
  const covered = hits.flatMap((k) => contentWords(k));
  const unexplained = taskSupport(query, task.id, catalog).unexplained.filter((w) => !covered.some((c) => wordMatches(w, c)));
  const explains =
    !sentenceGateEnabled() || independentHits.length >= RULE_MIN_INDEPENDENT_HITS || unexplained.length <= RULE_MAX_UNEXPLAINED;
  return { hits, independentHits, unexplained, explains };
}
