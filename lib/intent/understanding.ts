// Anlama katmanı — "bu sorguyu gerçekten anladık mı?" sorusunun saf (ağsız, LLM'siz) cevabı.
//
// Sorun (2026-10-18): kural katmanı hiçbir görev anahtar kelimesiyle eşleşmeyen bir sorguyu
// ("unity gamedev") ya LLM'e gönderiyordu (LLM'e "kusurlu olsa bile en yakın görevi seç" denir:
// "uygulama oluşturucu" seçilip alakasız araç gösteriliyordu), ya da LLM yokken tasks.json'daki
// İLK ÜÇ görevi ("uzun metin, pazarlama metni, e-posta") "şunu mu demek istedin?" diye soruyordu.
//
// Çözüm: kararı kataloğun KENDİ sözcük dağarcığıyla sına. Elle yazılmış "unity", "godot" kuralı yok;
// katalogda adı geçmeyen her yeni konu aynı şekilde yakalanır.
//   1) Sözcük dağarcığı: her görev için anahtar kelimeleri + etiketi + aktif ürünlerinin adı ("çekirdek")
//      ve açıklamaları. Veri değişince kendiliğinden güncellenir.
//   2) taskSupport: sorgudaki anlam taşıyan kelimelerden hangileri seçilen görevin dağarcığında geçiyor?
//      Hiçbiri geçmiyorsa görev seçimi DESTEKSİZDİR: tahmin sayılır, kullanıcıya sorulur.
//   3) relatedTasks: dağarcık örtüşmesine göre en yakın görevler ("şunu mu demek istedin?" adayları).
//   4) unknownTerms: katalogda hiçbir yerde geçmeyen kelimeler ("unity" -> "bu konuda araç bulamadım").
//   5) suggestSpelling: TEK kelimelik sorgu, bir ürün adına 1-2 harf uzaklıktaysa ("midjorney").
//      Bilerek yalnızca ürün adı: genel kelimede öneri, Türkçe ekler yüzünden yanlış pozitif verdi
//      (altın sette "çevirmem" -> "ceviren", "shoes" -> "shots" gibi 18 yanlış öneri; ölçüm 2026-10-18).
//
// Kasıtlı olarak DAR ve açıklanabilir: her karar "şu kelimeler katalogda yok / şu kelimeler bu işte
// geçiyor" diye gösterilebilir. Sayı, benchmark ya da ürün uydurmaz; yalnızca mevcut katalog metnini okur.

import { normalizeTr, tokenizeTr } from '../text';
import { isFillerToken } from './domainClarify';
import type { Product, Task } from '../catalog/schema';
import type { SearchContext } from '../catalog/search';

type Catalog = Pick<SearchContext, 'tasksById' | 'products'>;

/** Bir kelime en çok bu orandaki görevin dağarcığında geçiyorsa "ayırt edici"dir (ai, tool, uygulama gibi genel kelimeler elenir). */
const INFORMATIVE_MAX_DF = 0.25;
/** En az bu uzunluktaki kelimeler anlam taşır sayılır ("ai", "ve" gibi kısalar elenir). */
const MIN_TOKEN_LENGTH = 3;
/** Ek serbestliği: sorgu kelimesi katalog kelimesiyle BAŞLIYORSA eşleşir ("logolar" ~ "logo"); katalog kelimesi en az bu uzunlukta. */
const MIN_STEM_LENGTH = 4;
/** Ters yön ("logo" sorgusu, katalogda "logolar"): sorgu kelimesi en az bu uzunlukta. */
const MIN_QUERY_PREFIX_LENGTH = 5;
/** Yazım önerisi: bu uzunluktan kısa kelimelere öneri yapılmaz (yanlış pozitif çok). */
const MIN_SPELLING_LENGTH = 5;
/** Yazım önerisinde izin verilen en çok düzenleme: kısa kelimede 1, uzunda 2. */
const SPELLING_LONG_FROM = 8;
/** relatedTasks: görevin anahtar kelimesi/etiketi/ürün adıyla eşleşme, açıklamada eşleşmeden bu kat ağır sayılır. */
const CORE_WEIGHT = 3;
/** relatedTasks: en yüksek puanın bu oranından azı zayıf rastlantı sayılır ve adaylara girmez ("excel" -> yalnızca e-tablo görevi, Copilot açıklamasında geçen e-posta/slayt değil). */
const RELATED_MIN_RATIO = 0.4;

/** Kapatma anahtarı: UNDERSTANDING_GATE=off iken bu dosyadaki kararların hiçbiri uygulanmaz (eski davranış). */
export function understandingEnabled(): boolean {
  return process.env.UNDERSTANDING_GATE !== 'off';
}

/**
 * Tam uyan iş yokken en yakın işin araçlarını "tahmini eşleşme" etiketiyle doğrudan göstermek (recommendV3 approximateRecommendation).
 * APPROXIMATE_RESULTS=off: yalnızca "şunu mu demek istedin?" sorusu sorulur (kapı açık kalır).
 */
export function approximateEnabled(): boolean {
  return process.env.APPROXIMATE_RESULTS !== 'off';
}

/**
 * Hiçbir şey bilinmeyen sorguda sunulan başlangıç görevleri (alanların ilk görevi): "bunlardan hangisine yakın?".
 * lib/__tests__/understanding.test.ts her id'nin katalogda ve aktif ürünlü olduğunu kilitler.
 */
export const STARTER_TASKS: readonly string[] = [
  'chat.general-assistant',
  'text.write-longform',
  'image.generate',
  'video.text-to-video',
  'audio.tts-voiceover',
  'code.assistant-ide',
  'research.web',
  'data.spreadsheet-analysis',
  'slides.create',
];

/**
 * İstek/eylem fiilleri ve soru kelimeleri: bir işi anlatmaz, "ne olduğunu" söylemez ("yaz", "yap", "nasıl").
 * domainClarify.FILLERS'tan AYRI tutuldu: orada eylem fiilleri bilerek dolgu sayılmaz (tasks.json anahtar
 * kelimeleri onlara dayanır). Burada yalnızca anlama KONTROLÜ için yok sayılırlar; kural katmanını etkilemez.
 */
export const GENERIC_WORDS: readonly string[] = [
  // tr (normalizeTr biçiminde: diakritiksiz, küçük harf)
  'yap', 'yapmak', 'yapar', 'yapip', 'yaz', 'yazmak', 'yazdir', 'yazdirmak', 'yazar', 'olustur', 'olusturmak', 'uret', 'uretmek',
  'hazirla', 'hazirlamak', 'duzenle', 'duzenlemek', 'kullan', 'kullanmak', 'kullanarak', 'nasil', 'nedir', 'neden', 'hangi', 'nerede',
  'iyi', 'guzel', 'basit', 'hizli', 'ucretsiz', 'yeni', 'bilmiyorum', 'bilmiyor', 'bulmak', 'bul', 'goster', 'ver', 'ogren', 'ogrenmek',
  // en
  'make', 'makes', 'create', 'creating', 'build', 'building', 'generate', 'generating', 'write', 'writing', 'edit', 'editing',
  'use', 'using', 'show', 'give', 'learn', 'how', 'what', 'why', 'which', 'where', 'best', 'good', 'free', 'easy', 'quick', 'fast', 'simple',
];
const GENERIC = new Set(GENERIC_WORDS);

interface TaskWords {
  /** Anahtar kelimeler + etiket + aktif ürün adları: görevin NE olduğunu söyleyen kelimeler. */
  core: Set<string>;
  /** core + açıklamalar (görev ve ürün açıklamaları). */
  all: Set<string>;
}

interface Vocabulary {
  byTask: Map<string, TaskWords>;
  /** kelime -> kaç görevin dağarcığında (all) geçiyor */
  df: Map<string, number>;
  /** katalogdaki tüm anlam taşıyan kelimeler */
  all: Set<string>;
  /** aktif ürün adlarındaki kelimeler (yazım önerisi adayları) */
  names: Set<string>;
  /** normalize kelime -> gösterim biçimi (ürün adı / anahtar kelimedeki özgün yazım) */
  display: Map<string, string>;
  taskCount: number;
}

function isMeaningful(token: string): boolean {
  return token.length >= MIN_TOKEN_LENGTH && !/^\d+$/.test(token) && !GENERIC.has(token) && !isFillerToken(token);
}

function wordsOf(text: string | undefined): string[] {
  return text ? tokenizeTr(text).filter(isMeaningful) : [];
}

function coreTexts(task: Task, products: Product[]): string[] {
  return [...task.keywords.tr, ...task.keywords.en, task.label.tr, task.label.en, ...products.map((p) => p.name)];
}

function descriptionTexts(task: Task, products: Product[]): string[] {
  return [task.description.tr, task.description.en, ...products.flatMap((p) => [p.description.tr, p.description.en])];
}

function buildVocabulary(catalog: Catalog): Vocabulary {
  const byTask = new Map<string, TaskWords>();
  const df = new Map<string, number>();
  const all = new Set<string>();
  const names = new Set<string>();
  const display = new Map<string, string>();

  const remember = (text: string) => {
    for (const w of text.match(/[\p{L}\p{N}]+/gu) ?? []) {
      const key = normalizeTr(w);
      if (isMeaningful(key) && !display.has(key)) display.set(key, w);
    }
  };

  for (const task of catalog.tasksById.values()) {
    const active = catalog.products.filter((p) => p.status === 'active' && p.tasks.includes(task.id));
    const core = new Set<string>();
    for (const text of coreTexts(task, active)) for (const w of wordsOf(text)) core.add(w);
    const every = new Set<string>(core);
    for (const text of descriptionTexts(task, active)) for (const w of wordsOf(text)) every.add(w);
    byTask.set(task.id, { core, all: every });
    for (const w of every) {
      df.set(w, (df.get(w) ?? 0) + 1);
      all.add(w);
    }
    // Gösterim biçimi: anahtar kelime ve ürün adlarındaki özgün yazım ("Midjourney", "ElevenLabs").
    for (const k of [...task.keywords.tr, ...task.keywords.en]) remember(k);
    for (const p of active) {
      remember(p.name);
      for (const w of wordsOf(p.name)) if (w.length >= MIN_SPELLING_LENGTH) names.add(w);
    }
  }
  return { byTask, df, all, names, display, taskCount: Math.max(catalog.tasksById.size, 1) };
}

// Katalog nesneleri modül düzeyinde bir kez yüklenir (loadCatalog); aynı nesne için dağarcık bir kez kurulur.
const cache = new WeakMap<object, { products: Product[]; vocab: Vocabulary }>();

function vocabularyOf(catalog: Catalog): Vocabulary {
  const hit = cache.get(catalog.tasksById);
  if (hit && hit.products === catalog.products) return hit.vocab;
  const vocab = buildVocabulary(catalog);
  cache.set(catalog.tasksById, { products: catalog.products, vocab });
  return vocab;
}

function informative(vocab: Vocabulary, word: string): boolean {
  return (vocab.df.get(word) ?? 0) / vocab.taskCount <= INFORMATIVE_MAX_DF;
}

/** Sorgu kelimesi katalog kelimesiyle eşleşir mi? (eşit, ek almış hâli ya da kök hâli) */
export function wordMatches(queryWord: string, vocabWord: string): boolean {
  if (queryWord === vocabWord) return true;
  if (vocabWord.length >= MIN_STEM_LENGTH && queryWord.length > vocabWord.length && queryWord.startsWith(vocabWord)) return true;
  if (queryWord.length >= MIN_QUERY_PREFIX_LENGTH && vocabWord.length > queryWord.length && vocabWord.startsWith(queryWord)) return true;
  return false;
}

/** Sorgudaki anlam taşıyan kelimeler (dolgu, genel fiil, kısa ve sayı kelimeleri çıkarılmış, tekrarsız). */
export function contentWords(query: string): string[] {
  return [...new Set(tokenizeTr(query).filter(isMeaningful))];
}

export interface TaskSupport {
  /** Bu görevin dağarcığında geçen sorgu kelimeleri. */
  explained: string[];
  /** Bu görevin dağarcığında geçmeyen sorgu kelimeleri. */
  unexplained: string[];
  /** explained / (explained + unexplained); anlam taşıyan kelime yoksa 0. Yalnızca teşhis içindir, karar vermez. */
  coverage: number;
}

/**
 * Görev seçimi destekli mi: sorgunun anlam taşıyan kelimelerinden EN AZ BİRİ görevin dağarcığında geçiyor.
 * Eşik bilerek bu kadar düşük: oranla (%50) ölçüldüğünde altın setteki 25 belirsiz sorgunun 13'ü doğru görev
 * seçilse bile "desteksiz" çıkıyordu (uzun doğal cümleler); "en az bir kelime" ile 23/25 destekli, kalan 2'si
 * zaten gerçekten belirsiz sorgular ("bir şeyler yapmak istiyorum"). Ölçüm: 2026-10-18.
 */
export function isSupported(support: TaskSupport): boolean {
  return support.explained.length > 0;
}

function explainedBy(vocab: Vocabulary, words: Set<string>, queryWord: string): boolean {
  for (const v of words) if (informative(vocab, v) && wordMatches(queryWord, v)) return true;
  return false;
}

/**
 * Seçilen görev, sorgunun anlam taşıyan kelimelerinden en az birini açıklıyor mu?
 * `explained` boşsa görev seçimi destekli DEĞİLDİR (ör. "unity gamedev" -> "uygulama oluşturucu").
 */
export function taskSupport(query: string, taskId: string, catalog: Catalog): TaskSupport {
  const vocab = vocabularyOf(catalog);
  const words = vocab.byTask.get(taskId)?.all ?? new Set<string>();
  const explained: string[] = [];
  const unexplained: string[] = [];
  for (const q of contentWords(query)) (explainedBy(vocab, words, q) ? explained : unexplained).push(q);
  const total = explained.length + unexplained.length;
  return { explained, unexplained, coverage: total === 0 ? 0 : explained.length / total };
}

/** Kelime katalogda (genel kelimeler dahil) herhangi bir yerde geçiyor mu? */
function knownAnywhere(vocab: Vocabulary, queryWord: string): boolean {
  for (const v of vocab.all) if (wordMatches(queryWord, v)) return true;
  return false;
}

/**
 * Kataloğun HİÇBİR görevinde geçmeyen kelimeler (sorgudaki özgün yazımla).
 * "unity gamedev" -> ["unity", "gamedev"]. Kullanıcıya "bu konuda araç bulamadım" derken gösterilir.
 */
export function unknownTerms(query: string, catalog: Catalog, limit = 3): string[] {
  const vocab = vocabularyOf(catalog);
  const original = new Map<string, string>();
  for (const w of query.match(/[\p{L}\p{N}]+/gu) ?? []) {
    const key = normalizeTr(w);
    if (!original.has(key)) original.set(key, w);
  }
  const out: string[] = [];
  for (const q of contentWords(query)) {
    if (!knownAnywhere(vocab, q)) out.push(original.get(q) ?? q);
    if (out.length >= limit) break;
  }
  return out;
}

export interface RelatedTask {
  taskId: string;
  score: number;
}

/**
 * Sorguyla dağarcık örtüşmesi olan görevler, ayırt edici kelimelere göre ağırlıklı (nadir kelime = ağır;
 * anahtar kelime/etiket/ürün adı eşleşmesi açıklama eşleşmesinin CORE_WEIGHT katı).
 * Eşitlikte tasks.json sırası. Örtüşme yoksa boş liste: tahmin üretilmez.
 */
export function relatedTasks(query: string, catalog: Catalog, limit = 4): RelatedTask[] {
  const vocab = vocabularyOf(catalog);
  const words = contentWords(query);
  const out: RelatedTask[] = [];
  for (const [taskId, taskWords] of vocab.byTask) {
    let score = 0;
    for (const q of words) {
      let best = 0;
      for (const v of taskWords.all) {
        if (!informative(vocab, v) || !wordMatches(q, v)) continue;
        const weight = Math.log(vocab.taskCount / (vocab.df.get(v) ?? 1)) * (taskWords.core.has(v) ? CORE_WEIGHT : 1);
        best = Math.max(best, weight);
      }
      score += best;
    }
    if (score > 0) out.push({ taskId, score });
  }
  // Array.prototype.sort kararlı: eşit puanda tasks.json (Map ekleme) sırası kalır.
  const sorted = out.sort((a, b) => b.score - a.score);
  const top = sorted[0]?.score ?? 0;
  return sorted.filter((r) => r.score >= top * RELATED_MIN_RATIO).slice(0, limit);
}

// ------------------------------------------------------------------
// Yazım önerisi ("midjorney" -> "Midjourney")
// ------------------------------------------------------------------

/** Kısıtlı Damerau-Levenshtein: ekleme, silme, değiştirme ve komşu harf yer değiştirme 1 adım. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return Math.abs(m - n);
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array<number>(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

export interface SpellingSuggestion {
  /** Sorgudaki yanlış yazılmış kelime (özgün yazım). */
  from: string;
  /** Önerilen ürün adı kelimesi (gösterim biçimiyle). */
  to: string;
  /** Düzeltilmiş sorgu: yalnızca o kelime değişir, gerisi aynen. */
  corrected: string;
}

/**
 * Sorgunun TEK anlam taşıyan kelimesi bir ürün adına 1 (uzun kelimede 2) harf uzaklıktaysa öneri
 * ("midjorney", "chatgpd nedir"). Birden çok farklı en yakın ürün varsa (belirsiz), kelime katalogda olduğu gibi
 * geçiyorsa, ek almış geçerli bir hâlse ya da sorgu çok kelimeliyse null: tahmin etme.
 * Çağıran, düzeltilmiş sorgunun gerçekten bir ürün adı olduğunu ayrıca doğrular (matchProductByName).
 */
export function suggestSpelling(query: string, catalog: Catalog): SpellingSuggestion | null {
  const words = contentWords(query);
  if (words.length !== 1) return null;
  const q = words[0];
  const vocab = vocabularyOf(catalog);
  if (q.length < MIN_SPELLING_LENGTH || vocab.all.has(q)) return null;

  const allowed = q.length >= SPELLING_LONG_FROM ? 2 : 1;
  let best = Infinity;
  let winners: string[] = [];
  for (const v of vocab.names) {
    if (q.startsWith(v)) continue; // ek almış geçerli hâl ("gammayi", "canvas" gibi), yazım hatası değil
    const dist = editDistance(q, v);
    if (dist > allowed) continue;
    if (dist < best) { best = dist; winners = [v]; } else if (dist === best) winners.push(v);
  }
  if (winners.length !== 1) return null;

  const raw = (query.match(/[\p{L}\p{N}]+/gu) ?? []).find((w) => normalizeTr(w) === q);
  if (!raw) return null;
  const to = vocab.display.get(winners[0]) ?? winners[0];
  return { from: raw, to, corrected: query.replace(raw, to) };
}
