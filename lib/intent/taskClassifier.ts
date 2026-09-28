// Sorgudan görev bulma — RouteAI v3'ün ilk adımı (P11).
//
// İki kademe:
//  1. Kural tabanlı (LLM çağrısı yok): tasks.json'daki keywords.{tr,en} ile
//     hasTerm eşleşmesi. En iyi aday ikinciyi açık farkla (RULE_MARGIN)
//     geçiyorsa sonuç budur.
//  2. Belirsizse ya da hiç eşleşme yoksa ve allowLLM true: OpenAI json_schema
//     strict, taskId enum = tasks.json'daki 40 görev. Aynı çağrıda fiyat ve
//     dil kısıtı da istenir (recommendV3 ikinci bir çağrı yapmasın).
//
// LLM de başarısız olursa (anahtar yok, hata, kesik yanıt) hata dönülmez:
// kural puanına göre ilk 3 görev clarify olarak döner.
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
import { getCachedTask, setCachedTask } from './taskCache';

export interface TaskConstraints {
  pricing?: 'free' | 'freemium' | 'paid';
  language?: string;
}

export interface TaskClassification {
  taskId: string;
  confidence: number;
  source: 'rules' | 'llm';
  alternatives: string[];
  constraints: TaskConstraints;
}

export interface TaskClarify {
  clarify: [string, string, string];
}

export interface ClassifyTaskOptions {
  /** false: LLM hiç çağrılmaz; belirsiz sorgu doğrudan clarify döner. */
  allowLLM?: boolean;
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
  return `You are RouteAI's task classifier. Assign the user's request to EXACTLY ONE of the following tasks (pick the single closest match, even if imperfect):\n${list}\n\nAlso extract, ONLY if the user explicitly stated it:\n- pricing: "free" (must be free), "freemium" (has a free tier), "paid" (willing to pay) — "unspecified" if not stated.\n- language: the ISO 639-1 code of the language the user wrote in (e.g. "tr", "en").\nBe concise.`;
}

async function classifyByLLM(query: string, tasks: Task[]): Promise<{ taskId: string; confidence: number; constraints: TaskConstraints } | null> {
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
            },
            required: ['taskId', 'confidence', 'pricing', 'language'],
            additionalProperties: false,
          },
        },
      },
      temperature: 0,
      // Cevap 4 kısa alan: taskId, confidence, pricing, language. 200 fazlasıyla yeter;
      // yine de kesilirse (finish_reason 'length') cevap kullanılmaz (parser.ts'teki gibi).
      max_tokens: 200,
    });

    const choice = response.choices[0];
    if (choice?.finish_reason === 'length') return null;
    const content = choice?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content)) as {
      taskId?: unknown;
      confidence?: unknown;
      pricing?: unknown;
      language?: unknown;
    };

    if (typeof parsed.taskId !== 'string' || !taskIds.includes(parsed.taskId)) return null;

    const constraints: TaskConstraints = {};
    if (parsed.pricing === 'free' || parsed.pricing === 'freemium' || parsed.pricing === 'paid') {
      constraints.pricing = parsed.pricing;
    }
    if (typeof parsed.language === 'string' && parsed.language.trim()) constraints.language = parsed.language.trim();

    const confidence = typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.6;

    return { taskId: parsed.taskId, confidence, constraints };
  } catch (error) {
    console.error('[Task Classifier] LLM hatası:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// ------------------------------------------------------------------
// Orkestrasyon
// ------------------------------------------------------------------

export async function classifyTask(query: string, options: ClassifyTaskOptions = {}): Promise<TaskClassification | TaskClarify> {
  const cached = await getCachedTask(query);
  if (cached) return cached;

  const tasks = loadCatalog().tasks;
  const scores = scoreTasks(query, tasks);
  const [best, second] = scores;
  const margin = best.score - (second?.score ?? 0);
  const ruleConfident = best.score > 0 && margin >= RULE_MARGIN;
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
    result = { clarify: top3(scores) };
  } else {
    const llm = await classifyByLLM(query, tasks);
    result = llm
      ? {
          taskId: llm.taskId,
          confidence: llm.confidence,
          source: 'llm',
          alternatives: alternativesFrom(scores, llm.taskId),
          constraints: Object.keys(llm.constraints).length > 0 ? llm.constraints : ruleConstraints,
        }
      : { clarify: top3(scores) };
  }

  if (!('clarify' in result)) await setCachedTask(query, result);
  return result;
}
