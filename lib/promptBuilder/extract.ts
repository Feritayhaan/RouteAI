// Konuşmadan slot değerlerini çıkarır: TEK OpenAI çağrısı (json_schema strict).
// Söylenen bilgi (user, 0.9-1), güçlü ima (inferred, 0.65-0.85); söylenmeyen
// slot için amaca uygun akıllı varsayım (inferred, 0.35-0.55). null sadece
// giriş boş ya da anlamsızsa. Aynı çağrıda, güveni MIN_CONFIDENCE (0.65)
// altında kalan 'high' slotlar için girişe uygun soru + 2-4 seçenek de yazılır;
// PromptCard'daki "Varsayımlar (Değiştir)" bunları gösterir. Sorular
// sanitizeQuestions ile doğrulanır; geçersizse rehberdeki soru kullanılır.

import { z } from 'zod';
import type { Guide } from './guideSchema';
import type { JsonLLM } from './llm';
import type { DynamicQuestion } from './types';

export interface ExtractedSlot {
  value: string | null;
  source: 'user' | 'inferred';
  confidence: number;
}

export interface Extraction {
  slots: Record<string, ExtractedSlot>;
  goalSummary: string;
  /** Girişe göre üretilmiş sorular (slotId -> soru). Boş olabilir. */
  questions: Record<string, DynamicQuestion>;
  tokens: number;
}

const rawQuestionSchema = z.object({
  slotId: z.string(),
  question: z.string(),
  options: z.array(z.object({ label: z.string(), value: z.string() })),
});

const outputSchema = z.object({
  slots: z.array(z.object({
    id: z.string(),
    value: z.string().nullable(),
    source: z.enum(['user', 'inferred']),
    confidence: z.number(),
  })),
  goalSummary: z.string(),
  questions: z.array(rawQuestionSchema).default([]),
});

export const DYNAMIC_OPTIONS = { min: 2, max: 4 } as const;
const QUESTION_MAX = 160;
const LABEL_MAX = 60;
const VALUE_MAX = 200;
/** "Sen seç" ve serbest metin kartta zaten var; model bunları seçenek olarak yazmasın. */
const RESERVED = new Set(['auto', 'sen seç', 'sen sec', 'you choose', 'other', 'diğer']);

/**
 * Modelin yazdığı soruları doğrular: bilinen slot, tek soru, makul uzunluk,
 * tekrarsız 2-4 seçenek. Geçmeyen soru atılır (rehberdeki sabit soru kullanılır).
 * Seçenek id'leri o1..o4 olarak verilir.
 */
export function sanitizeQuestions(raw: z.infer<typeof rawQuestionSchema>[], guide: Guide): Record<string, DynamicQuestion> {
  const known = new Set(guide.slots.map((s) => s.id));
  const out: Record<string, DynamicQuestion> = {};
  for (const q of raw) {
    if (!known.has(q.slotId) || q.slotId in out) continue;
    const question = q.question.trim();
    if (question.length < 3 || question.length > QUESTION_MAX) continue;
    const seen = new Set<string>();
    const options: DynamicQuestion['options'] = [];
    for (const o of q.options) {
      const label = o.label.trim();
      const value = o.value.trim();
      const key = label.toLocaleLowerCase('tr');
      if (!label || !value || label.length > LABEL_MAX || value.length > VALUE_MAX) continue;
      if (RESERVED.has(key) || seen.has(key)) continue;
      seen.add(key);
      options.push({ id: `o${options.length + 1}`, label, value });
      if (options.length === DYNAMIC_OPTIONS.max) break;
    }
    if (options.length < DYNAMIC_OPTIONS.min) continue;
    out[q.slotId] = { question, options };
  }
  return out;
}

export async function extractSlots(
  { conversation, goal, guide, locale, llm, signal }: {
    conversation: { role: 'user' | 'assistant'; content: string }[];
    goal: string;
    guide: Guide;
    locale: 'en' | 'tr';
    llm: JsonLLM;
    signal?: AbortSignal;
  }
): Promise<Extraction> {
  const userLanguage = locale === 'tr' ? 'Turkish' : 'English';
  const promptLanguage = guide.promptLanguage === 'user' ? userLanguage : 'English';
  const slotSpec = guide.slots.map((s) => ({
    id: s.id,
    impact: s.impact,
    question: s.question.en,
    options: s.options.map((o) => o.value),
  }));
  const system = `You are an expert prompt engineer extracting details for a prompt for an AI tool. Return a value for EVERY slot:
- Stated explicitly by the user: source "user", confidence 0.9-1.0.
- Strongly implied by the conversation: source "inferred", confidence 0.65-0.85.
- Not mentioned: do NOT return null. Choose the value that best fits this user's specific goal and conversation, as an expert prompt engineer would, in ${promptLanguage} (max 12 words). Mark it source "inferred", confidence 0.35-0.55, so it is shown to the user as a smart assumption they can change.
- Return null ONLY if the goal and conversation are empty or meaningless.
- Prefer one of the slot's option values when it fits; otherwise a short free-text value (max 12 words).
- An assumed value is a choice (style, format, tone, length, structure), never a fact: do not invent names, numbers, prices, dates, quotes or statistics the user did not give.
- goalSummary: one sentence in ${userLanguage} describing what the user wants to create.
Return every slot id exactly once.

questions: for EVERY slot with impact "high" whose confidence is below 0.65 (including the smart assumptions above), write ONE question tailored to the user's goal so they can change the assumption with one tap. For all other slots write no question.
- question: short (max 12 words), in ${userLanguage}, about THIS goal (e.g. for a bakery logo ask about the logo's style, not generic image topics). Never ask about something the user already said.
- options: 2-4 clearly different answers that make sense for this goal. label: max 5 words in ${userLanguage}. value: the phrase that goes into the prompt, in ${promptLanguage}, max 12 words.
- The slot's example options are only hints; adapt them to the goal.
- Do not add "you choose" or "other" options (the UI has them). Keep the user's own names and brands; do not introduce real people or copyrighted characters.`;
  const user = JSON.stringify({
    goal,
    slots: slotSpec,
    conversation: conversation.slice(-12).map((m) => `${m.role}: ${m.content}`).join('\n'),
  });
  const slotIds = guide.slots.map((s) => s.id);
  const { data, tokens } = await llm({
    name: 'slot_extraction',
    system,
    user,
    maxTokens: 1000,
    temperature: 0.1,
    signal,
    schema: {
      type: 'object',
      properties: {
        slots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', enum: slotIds },
              value: { type: ['string', 'null'] },
              source: { type: 'string', enum: ['user', 'inferred'] },
              confidence: { type: 'number' },
            },
            required: ['id', 'value', 'source', 'confidence'],
            additionalProperties: false,
          },
        },
        goalSummary: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slotId: { type: 'string', enum: slotIds },
              question: { type: 'string' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { label: { type: 'string' }, value: { type: 'string' } },
                  required: ['label', 'value'],
                  additionalProperties: false,
                },
              },
            },
            required: ['slotId', 'question', 'options'],
            additionalProperties: false,
          },
        },
      },
      required: ['slots', 'goalSummary', 'questions'],
      additionalProperties: false,
    },
  });

  const parsed = outputSchema.parse(data);
  const known = new Set(slotIds);
  const slots: Record<string, ExtractedSlot> = {};
  for (const s of parsed.slots) {
    if (!known.has(s.id) || s.id in slots) continue;
    const value = s.value?.trim() ? s.value.trim().slice(0, 200) : null;
    slots[s.id] = { value, source: s.source, confidence: Math.max(0, Math.min(1, s.confidence)) };
  }
  return {
    slots,
    goalSummary: parsed.goalSummary.slice(0, 300),
    questions: sanitizeQuestions(parsed.questions, guide),
    tokens,
  };
}
