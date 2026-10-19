// Sorgudan görev bulma — RouteAI v3'ün ilk adımı (P11).
//
// İki kademe:
//  1. Kural tabanlı (LLM çağrısı yok): tasks.json'daki keywords.{tr,en} ile
//     hasTerm eşleşmesi. En iyi aday ikinciyi açık farkla (RULE_MARGIN)
//     geçiyorsa VE görev cümlenin özünü açıklıyorsa (lib/intent/sentenceEvidence.ts:
//     en az iki ayrı anahtar kelime ya da görevin açıklayamadığı anlamlı kelime ≤ 3) sonuç budur. Uzun bir cümlede tek bir
//     yan kelime ("hikaye", "fatura", "excel") kararı veremez: o cümle bütün olarak LLM'e gider.
//     Kapatma: SENTENCE_GATE=off (eski davranış: tek anahtar kelime yeter).
//  2. Belirsizse ya da hiç eşleşme yoksa ve allowLLM true: OpenAI json_schema
//     strict, taskId enum = tasks.json'daki 40 görev. Aynı çağrıda fiyat ve
//     dil kısıtı da istenir (recommendV3 ikinci bir çağrı yapmasın).
//
// LLM de başarısız olursa (anahtar yok, hata, kesik yanıt) hata dönülmez:
// kural puanına göre ilk 3 görev clarify olarak döner. Hiçbir görev anahtar kelimesi tutmadıysa
// (puan 0) "ilk üç görev" anlamsızdır (tasks.json sırası): bunun yerine kataloğun sözcük dağarcığıyla
// en yakın görevler (lib/intent/understanding.ts relatedTasks) `reason: 'no_match'` ile döner;
// hiç yakın görev yoksa liste boştur ve çağıran (recommendV3) başlangıç görevlerini sunar.
// Kapatma: UNDERSTANDING_GATE=off (eski davranış: puan 0 olsa da ilk üç görev).
//
// LLM ayrıca `fit` (exact/partial/none) bildirir: "en yakın görev gerçekten bu işi yapıyor mu?".
// Kararı recommendV3 verir (fit + sözcük desteği); burada yalnızca taşınır ve önbelleğe girer.
//
// Belirsizlik: aynı LLM çağrısında `needsClarification` + `candidates` da istenir.
// Model "tek görev seçmek tahmin olur" derse ve geçerli en az 2 aday verirse sonuç
// clarify olur (2-4 görev). Kapatma anahtarı: AMBIGUITY_CLARIFY=off (eski davranış:
// LLM hep tek görev seçer). Bu karar yalnızca kural katmanının emin olmadığı
// sorgularda devreye girer; lib/intent/domainClarify.ts ise LLM'den önce, kuralla
// ve ücretsiz çalışır.
//
// Önbellek: lib/intent/taskCache.ts (KV, task:v1: öneki, 24 saat). Yalnızca
// kesin sonuçlar (rules ya da llm) önbelleğe yazılır; clarify yazılmaz —
// keywords.json ya da eşik zamanla iyileşebilir, ucuz olduğu için yeniden
// hesaplanır (bkz. lib/intent/index.ts'teki aynı karar).

import { openai } from '../openai';
import { hasTerm } from '../text';
import { loadCatalog } from '../catalog/index';
import type { Task } from '../catalog/schema';
import { extractConstraints } from './parser';
import { ruleEvidence } from './sentenceEvidence';
import { getCachedTask, setCachedTask } from './taskCache';
import { relatedTasks, understandingEnabled } from './understanding';

export interface TaskConstraints {
  pricing?: 'free' | 'freemium' | 'paid';
  language?: string;
}

/** LLM'in kendi değerlendirmesi: seçtiği görev isteği gerçekten karşılıyor mu? */
export type TaskFit = 'exact' | 'partial' | 'none';

export interface TaskClassification {
  taskId: string;
  confidence: number;
  source: 'rules' | 'llm';
  alternatives: string[];
  constraints: TaskConstraints;
  /** Yalnızca source 'llm' için: seçilen görev isteği tam karşılıyor mu (eski önbellek kayıtlarında yok). */
  fit?: TaskFit;
  /** Yalnızca source 'llm' için: LLM'in "en yakın" dediği görevler (en olası önce, katalogda ürünü olanlar). */
  closest?: string[];
}

export interface TaskClarify {
  /**
   * Sorulacak görev id'leri: kural yedeğinde 3 (puan >0 ise), LLM belirsizlik kararında 2-4.
   * `reason: 'no_match'` iken 0-4: sorguyla sözcük örtüşmesi olan görevler, hiç yoksa boş.
   */
  clarify: string[];
  /** Yalnızca 'no_match': sorgunun hiçbir görev anahtar kelimesi tutmadı. Yoksa klasik belirsizlik. */
  reason?: 'no_match';
}

export interface ClassifyTaskOptions {
  /** false: LLM hiç çağrılmaz; belirsiz sorgu doğrudan clarify döner. */
  allowLLM?: boolean;
  /** false: KV önbelleği okunmaz/yazılmaz (sadece kural katmanının kendi kararı istenirken). */
  useCache?: boolean;
}

/** En iyi aday ikinciyi en az bu kadar puan geçmeli; testlerle belirlendi (evals/golden.jsonl). */
const RULE_MARGIN = 1;

interface RuleScore {
  taskId: string;
  score: number;
}

function scoreTasks(query: string, tasks: Task[]): RuleScore[] {
  return tasks
    .map((t) => {
      // Set: aynı kelime hem tr hem en listesinde olabilir (ör. "video"); iki
      // kere sayılıp puanı yapay yükseltmesin.
      const allKeywords = new Set([...t.keywords.tr, ...t.keywords.en]);
      let score = 0;
      for (const k of allKeywords) if (hasTerm(query, k)) score++;
      return { taskId: t.id, score };
    })
    .sort((a, b) => b.score - a.score); // stabil sıralama: eşitlikte tasks.json sırası korunur
}

function top3(scores: RuleScore[]): [string, string, string] {
  const [a, b, c] = scores;
  return [a.taskId, b?.taskId ?? a.taskId, c?.taskId ?? a.taskId];
}

/** Kazanan hariç, puanı >0 olan ilk 3 görev. */
function alternativesFrom(scores: RuleScore[], winnerId: string): string[] {
  return scores.filter((s) => s.taskId !== winnerId && s.score > 0).slice(0, 3).map((s) => s.taskId);
}

/** Bir sorguda en fazla bu kadar seçenek sorulur (ClarifyDisplay 3'lü ızgara; 4'ten fazlası karar yorgunluğu). */
const MAX_CANDIDATES = 4;

/**
 * Kural katmanı emin değilken (ve LLM yok/başarısız) sorulacaklar. Puan 0 ise tasks.json sırası anlamsızdır:
 * katalogla gerçekten örtüşen görevler sunulur (UNDERSTANDING_GATE=off: eski davranış).
 */
function ruleFallback(query: string, scores: RuleScore[], catalog: ReturnType<typeof loadCatalog>): TaskClarify {
  if (!understandingEnabled()) return { clarify: top3(scores) };
  const offerable = (id: string) => (catalog.productsByTask.get(id) ?? []).length > 0;
  if (scores[0].score > 0) {
    // Anahtar kelimesi tutan görevler önce; kalan yerler cümlenin sözcük örtüşmesiyle dolar (tasks.json sırasıyla değil).
    // Kapı (sentenceEvidence) artık tek kelimeli eşleşmeleri de buraya bırakıyor: ilk 3'te cümleye uyan görevler olmalı.
    const picked = scores.filter((s) => s.score > 0).map((s) => s.taskId);
    for (const r of relatedTasks(query, catalog, MAX_CANDIDATES)) if (offerable(r.taskId) && !picked.includes(r.taskId)) picked.push(r.taskId);
    for (const s of scores) if (picked.length < 3 && !picked.includes(s.taskId)) picked.push(s.taskId);
    return { clarify: picked.slice(0, 3) };
  }
  const related = relatedTasks(query, catalog, MAX_CANDIDATES).map((r) => r.taskId).filter(offerable);
  return { clarify: related, reason: 'no_match' };
}

function ruleConfidence(best: number, margin: number): number {
  return Math.min(0.95, 0.55 + 0.12 * best + 0.08 * margin);
}

function pickPriceLang(c: ReturnType<typeof extractConstraints>): TaskConstraints {
  const out: TaskConstraints = {};
  // extractConstraints 'freemium'i sadece varsayılan olarak yazar ("tercih belirtilmedi"):
  // kısıt değildir, yoksa her sorgu "ücretsiz planı olsun" filtresine dönüşür.
  if (c.pricing && c.pricing !== 'freemium') out.pricing = c.pricing;
  if (c.language) out.language = c.language;
  return out;
}

// ------------------------------------------------------------------
// LLM kademesi
// ------------------------------------------------------------------

const PRICING_VALUES = ['free', 'freemium', 'paid', 'unspecified'] as const;

function systemPrompt(tasks: Task[]): string {
  const list = tasks.map((t) => `- ${t.id}: ${t.label.en} — ${t.description.en}`).join('\n');
  return `You are RouteAI's task classifier. Assign the user's request to EXACTLY ONE of the following tasks (pick the single closest match, even if imperfect):\n${list}\n\nRead the WHOLE message and decide what the user wants to end up with (the outcome), not which single word appears in it. People usually describe the goal in everyday words without naming a tool or a task type ("something memorable for my shop sign" means a logo). A word that only names the topic or the input does not choose the task: in "make a song from my diary entries" the task is music, not writing; in "put my sales numbers on a live screen for the team" it is a dashboard, not spreadsheet analysis.\n\nAlso extract, ONLY if the user explicitly stated it:\n- pricing: "free" (must be free), "freemium" (has a free tier), "paid" (willing to pay) — "unspecified" if not stated.\n- language: the ISO 639-1 code of the language the user wrote in (e.g. "tr", "en").\n\nAmbiguity — set needsClarification:\n- true ONLY when the request is so open that recommending any single task would be a guess: it names just a broad area or goal ("something for my business", "help with content") or fits several different tasks about equally, and the user did not say what they want to make or do.\n- false whenever one task clearly fits, even if details such as style, length, audience or tool are missing.\nFit — set fit honestly, it is NOT the same as confidence:\n- "exact": one task directly does what the user wants to make or do.\n- "partial": the closest task is only adjacent or covers part of the request — typically the user names a specific engine, platform, domain or niche that no task is actually about, so the tools of that task would not really solve it.\n- "none": no task fits at all.\nWhen needsClarification is true OR fit is not "exact", list the 2-4 closest task ids in candidates, ordered by how much their tools could genuinely help with the request (most helpful first; the first one should be your taskId). Otherwise candidates must be an empty array. taskId is always your single best guess.\nBe concise.`;
}

/** Kapatma anahtarı: AMBIGUITY_CLARIFY=off iken LLM "belirsiz" dese de tek görev seçilir (eski davranış). */
function ambiguityEnabled(): boolean {
  return process.env.AMBIGUITY_CLARIFY !== 'off';
}

export interface LLMClassification {
  taskId: string;
  confidence: number;
  constraints: TaskConstraints;
  /** LLM "belirsiz" dedi ve geçerli en az 2 aday verdi: sorulacak görevler, en olası önce. */
  clarifyCandidates?: string[];
  /** LLM'in bu işe yakın bulduğu görevler (belirsizlik kararından BAĞIMSIZ), katalogda ürünü olanlar, en olası önce. */
  closest?: string[];
  /** Seçilen görev isteği karşılıyor mu (LLM'in kendi değerlendirmesi). Geçersiz/eksikse yok. */
  fit?: TaskFit;
}

/**
 * LLM'in JSON cevabını doğrular (saf fonksiyon: ağ yok, testlerde doğrudan çağrılır).
 * Geçersiz JSON ya da bilinmeyen taskId -> null (çağıran kural yedeğine düşer).
 * `offerable`: sorulabilecek görevler (en az bir aktif ürünü olanlar); aday listesi bununla süzülür,
 * böylece "ürünü olmayan" bir seçenek sunulmaz. Aday uydurması da aynı süzgeçten geçer.
 */
export function parseLLMClassification(
  raw: string,
  taskIds: readonly string[],
  offerable: ReadonlySet<string>,
  ambiguity: boolean = ambiguityEnabled()
): LLMClassification | null {
  let parsed: {
    taskId?: unknown;
    confidence?: unknown;
    pricing?: unknown;
    language?: unknown;
    needsClarification?: unknown;
    candidates?: unknown;
    fit?: unknown;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.taskId !== 'string' || !taskIds.includes(parsed.taskId)) return null;

  const constraints: TaskConstraints = {};
  if (parsed.pricing === 'free' || parsed.pricing === 'freemium' || parsed.pricing === 'paid') {
    constraints.pricing = parsed.pricing;
  }
  if (typeof parsed.language === 'string' && parsed.language.trim()) constraints.language = parsed.language.trim();

  const confidence = typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.6;

  const out: LLMClassification = { taskId: parsed.taskId, confidence, constraints };
  if (parsed.fit === 'exact' || parsed.fit === 'partial' || parsed.fit === 'none') out.fit = parsed.fit;
  if (Array.isArray(parsed.candidates)) {
    const closest = [...new Set(parsed.candidates.filter((c): c is string => typeof c === 'string'))]
      .filter((id) => taskIds.includes(id) && offerable.has(id))
      .slice(0, MAX_CANDIDATES);
    if (closest.length > 0) out.closest = closest;
  }

  if (ambiguity && parsed.needsClarification === true && Array.isArray(parsed.candidates)) {
    // En iyi tahmin de seçeneklerde olsun (model tutarsız verirse bile), tekrarsız, katalogda ürünü olanlar.
    const ordered = [parsed.taskId, ...parsed.candidates.filter((c): c is string => typeof c === 'string')];
    const unique = [...new Set(ordered)].filter((id) => taskIds.includes(id) && offerable.has(id)).slice(0, MAX_CANDIDATES);
    if (unique.length >= 2) out.clarifyCandidates = unique;
  }
  return out;
}

async function classifyByLLM(query: string, tasks: Task[], offerable: ReadonlySet<string>): Promise<LLMClassification | null> {
  const taskIds = tasks.map((t) => t.id);
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt(tasks) },
        { role: 'user', content: query },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'task_classification',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', enum: taskIds },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              pricing: { type: 'string', enum: [...PRICING_VALUES] },
              language: { type: 'string' },
              needsClarification: { type: 'boolean' },
              // minItems/maxItems bilerek yok: strict şemada desteği garanti değil, bir red tüm
              // sınıflandırmayı bozar. Uzunluk parseLLMClassification'da doğrulanır.
              candidates: { type: 'array', items: { type: 'string', enum: taskIds } },
              fit: { type: 'string', enum: ['exact', 'partial', 'none'] },
            },
            required: ['taskId', 'confidence', 'pricing', 'language', 'needsClarification', 'candidates', 'fit'],
            additionalProperties: false,
          },
        },
      },
      temperature: 0,
      // Cevap 7 kısa alan (en çok 4 görev id'li aday listesi dahil) ~110 token tutar; 300 payı bol.
      // Yine de kesilirse (finish_reason 'length') cevap kullanılmaz (parser.ts'teki gibi).
      max_tokens: 300,
    });

    const choice = response.choices[0];
    if (choice?.finish_reason === 'length') return null;
    const content = choice?.message?.content;
    if (!content) return null;

    return parseLLMClassification(typeof content === 'string' ? content : JSON.stringify(content), taskIds, offerable);
  } catch (error) {
    console.error('[Task Classifier] LLM hatası:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// ------------------------------------------------------------------
// Orkestrasyon
// ------------------------------------------------------------------

export async function classifyTask(query: string, options: ClassifyTaskOptions = {}): Promise<TaskClassification | TaskClarify> {
  const useCache = options.useCache !== false;
  const cached = useCache ? await getCachedTask(query) : null;
  if (cached) return cached;

  const catalog = loadCatalog();
  const tasks = catalog.tasks;
  const scores = scoreTasks(query, tasks);
  const [best, second] = scores;
  const margin = best.score - (second?.score ?? 0);
  // Anahtar kelime farkı yetmez: eşleşen kelimeler cümlenin özünü de açıklamalı (tek yan kelime LLM'i atlatamaz).
  const bestTask = tasks.find((t) => t.id === best.taskId);
  const ruleConfident = best.score > 0 && margin >= RULE_MARGIN && (!bestTask || ruleEvidence(query, bestTask, catalog).explains);
  const ruleConstraints = pickPriceLang(extractConstraints(query));

  let result: TaskClassification | TaskClarify;

  if (ruleConfident) {
    result = {
      taskId: best.taskId,
      confidence: ruleConfidence(best.score, margin),
      source: 'rules',
      alternatives: alternativesFrom(scores, best.taskId),
      constraints: ruleConstraints,
    };
  } else if (options.allowLLM === false) {
    result = ruleFallback(query, scores, catalog);
  } else {
    const offerable = new Set(tasks.filter((t) => (catalog.productsByTask.get(t.id) ?? []).length > 0).map((t) => t.id));
    const llm = await classifyByLLM(query, tasks, offerable);
    if (llm?.clarifyCandidates) {
      result = { clarify: llm.clarifyCandidates };
    } else {
      result = llm
        ? {
            taskId: llm.taskId,
            confidence: llm.confidence,
            source: 'llm',
            alternatives: alternativesFrom(scores, llm.taskId),
            constraints: Object.keys(llm.constraints).length > 0 ? llm.constraints : ruleConstraints,
            ...(llm.fit ? { fit: llm.fit } : {}),
            ...(llm.closest ? { closest: llm.closest } : {}),
          }
        : ruleFallback(query, scores, catalog);
    }
  }

  if (useCache && !('clarify' in result)) await setCachedTask(query, result);
  return result;
}
