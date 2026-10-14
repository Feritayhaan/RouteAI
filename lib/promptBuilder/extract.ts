// Konuşmadan slot değerlerini çıkarır: TEK OpenAI çağrısı (json_schema strict).
// Söylenen bilgi (user, 0.9-1), güçlü ima (inferred, 0.65-0.85); söylenmeyen
// slot için amaca uygun akıllı varsayım (inferred, 0.35-0.55). null sadece
// giriş boş ya da anlamsızsa. Aynı çağrıda, güveni MIN_CONFIDENCE (0.65)
// altında kalan 'high' slotlar için girişe uygun soru + 2-4 seçenek de yazılır;
// PromptCard'daki "Varsayımlar (Değiştir)" bunları gösterir. Sorular
// sanitizeQuestions ile doğrulanır; geçersizse rehberdeki soru kullanılır.
//
// Geniş hedef (isBroadGoal): giriş sadece genel bir hedef söylüyor, alt kapsam,
// tür/stil, hedef çıktı ya da yön hakkında hiçbir ayrıntı yok ("bir uygulama
// yapmak istiyorum"). O zaman çıkarılan 'high' slotların güveni MIN_CONFIDENCE
// altına çekilir; plan.ts önce navigasyon soru kartını gösterir.
// Her slot değerinin kullanıcı dilinde kısa etiketi (label) "Şunları varsaydım"
// listesinde gösterilir (prompt dili İngilizce olsa bile).
//
// Kanıt (evidence): model "kullanıcı söyledi" ya da güçlü ima dediği her değer
// için kullanıcının mesajından kelimesi kelimesine alıntı verir; kod alıntının
// kullanıcı mesajlarında gerçekten geçtiğini denetler (verifyEvidence). Geçmezse
// (uydurma, ajanın özeti `goal`dan alıntı, sadece ürün adı) değer kalır ama
// akıllı varsayım sayılır: source 'inferred', güven UNVERIFIED_CONFIDENCE_CAP.
// İlk gerçek eval'de (2026-10-14) "Make me a presentation." için
// "investors" ve "8-10 slides" source 'user' gelmişti; soru kartı çıkmıyordu.

import { z } from 'zod';
import type { Guide } from './guideSchema';
import type { JsonLLM } from './llm';
import type { DynamicQuestion } from './types';
import { MIN_CONFIDENCE } from './plan';
import { fold } from './sufficiency';

export interface ExtractedSlot {
  value: string | null;
  source: 'user' | 'inferred';
  confidence: number;
  /** Değerin kullanıcı dilinde kısa karşılığı (varsayım listesinde gösterilir). */
  label?: string | null;
}

/** Geniş hedefte 'high' slot güveninin üst sınırı (MIN_CONFIDENCE 0.65'in altı). */
export const BROAD_GOAL_CONFIDENCE_CAP = 0.6;
/** Kanıtı doğrulanamayan değerin güven üst sınırı (akıllı varsayım aralığı, MIN_CONFIDENCE altı). */
export const UNVERIFIED_CONFIDENCE_CAP = 0.55;

/** Karşılaştırma biçimi: küçük harf, aksansız, noktalama yerine tek boşluk. */
const normalize = (s: string) => fold(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Alıntı kullanıcının mesajlarında (asistan mesajları ve goal değil) geçiyor mu?
 * Kelime başından eşleşir, son kelimenin eki serbest (Türkçe: "poster" ~ "posteri").
 * Sadece ürün adından ya da 2 karakterden kısa alıntı kanıt sayılmaz.
 */
export function verifyEvidence(evidence: string | null | undefined, userText: string, productName = ''): boolean {
  const e = normalize(evidence ?? '');
  if (e.length < 2) return false;
  const product = normalize(productName);
  if (product && (e === product || product.split(' ').includes(e))) return false;
  return ` ${normalize(userText)}`.includes(` ${e}`);
}

export interface Extraction {
  slots: Record<string, ExtractedSlot>;
  goalSummary: string;
  /** Sadece genel bir hedef: alt kapsam, tür, çıktı ya da yön yok. */
  isBroadGoal: boolean;
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
    label: z.string().nullable().optional(),
    evidence: z.string().nullable().optional(),
  })),
  goalSummary: z.string(),
  isBroadGoal: z.boolean().default(false),
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
  { conversation, goal, guide, locale, llm, signal, productName = '' }: {
    conversation: { role: 'user' | 'assistant'; content: string }[];
    goal: string;
    guide: Guide;
    locale: 'en' | 'tr';
    llm: JsonLLM;
    signal?: AbortSignal;
    /** Kanıt denetimi: sadece ürün adı kanıt sayılmaz. */
    productName?: string;
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
- label: the same choice as a short phrase (max 6 words) in ${userLanguage} for the user to read; null when value is null.
- evidence: for source "user" and for "strongly implied" values, copy the exact words from the user's messages in the conversation (max 12 words, unchanged) that state or imply the value. null for a smart assumption. "goal" is RouteAI's short summary, not the user's words: never quote it. A tool or product name alone is not evidence. If you cannot quote the user, the value is a smart assumption (confidence 0.35-0.55).
- An assumed value is a choice (style, format, tone, length, structure), never a fact: do not invent names, numbers, prices, dates, quotes or statistics the user did not give.
- goalSummary: one sentence in ${userLanguage} describing what the user wants to create.
Return every slot id exactly once.

isBroadGoal: true when the user only names a general goal or topic (often 2-6 words, e.g. "I want to make an app", "I'll make a song") and gives NO specific detail about scope, sub-part, type/style, target output or technical/creative direction. Then no "high" slot can be known: give every "high" slot confidence below 0.65 (keep your smart assumption as its value). false when the user gave at least one such specific detail.

questions: for EVERY slot with impact "high" whose confidence is below 0.65 (including the smart assumptions above), write ONE question tailored to the user's goal so they can change the assumption with one tap. For all other slots write no question.
- question: short (max 12 words), in ${userLanguage}, about THIS goal (e.g. for a bakery logo ask about the logo's style, not generic image topics). Never ask about something the user already said.
- For a broad goal, ask the 2-3 navigation questions that really shape the work: which stage or deliverable of the project the prompt is for, which type/style/approach, what the output should be. Never ask shallow format questions ("a short paragraph?").
- options: 2-4 clearly different, concrete answers that make sense for this goal. label: max 5 words in ${userLanguage}. value: the phrase that goes into the prompt, in ${promptLanguage}, max 12 words.
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
              label: { type: ['string', 'null'] },
              evidence: { type: ['string', 'null'] },
            },
            required: ['id', 'value', 'source', 'confidence', 'label', 'evidence'],
            additionalProperties: false,
          },
        },
        goalSummary: { type: 'string' },
        isBroadGoal: { type: 'boolean' },
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
      required: ['slots', 'goalSummary', 'isBroadGoal', 'questions'],
      additionalProperties: false,
    },
  });

  const parsed = outputSchema.parse(data);
  const known = new Set(slotIds);
  const high = new Set(guide.slots.filter((s) => s.impact === 'high').map((s) => s.id));
  // Kanıt kullanıcının sözünde aranır; konuşmada kullanıcı mesajı yoksa elimizdeki tek söz amaçtır.
  const userTurns = conversation.filter((m) => m.role === 'user').map((m) => m.content);
  const userText = userTurns.length ? userTurns.join('\n') : goal;
  const slots: Record<string, ExtractedSlot> = {};
  for (const s of parsed.slots) {
    if (!known.has(s.id) || s.id in slots) continue;
    const value = s.value?.trim() ? s.value.trim().slice(0, 200) : null;
    let confidence = Math.max(0, Math.min(1, s.confidence));
    let source = s.source;
    // "Kullanıcı söyledi" ya da güçlü ima: kullanıcının sözünden alıntıyla kanıtlanmalı.
    if (value && (source === 'user' || confidence >= MIN_CONFIDENCE) && !verifyEvidence(s.evidence, userText, productName)) {
      source = 'inferred';
      confidence = Math.min(confidence, UNVERIFIED_CONFIDENCE_CAP);
    }
    // Geniş hedefte çıkarılan 'high' slot yüksek güvenli sayılmaz (kullanıcının açıkça söylediği hariç).
    if (parsed.isBroadGoal && high.has(s.id) && source !== 'user') confidence = Math.min(confidence, BROAD_GOAL_CONFIDENCE_CAP);
    const label = value && s.label?.trim() ? s.label.trim().slice(0, 80) : null;
    slots[s.id] = { value, source, confidence, ...(label ? { label } : {}) };
  }
  return {
    slots,
    goalSummary: parsed.goalSummary.slice(0, 300),
    isBroadGoal: parsed.isBroadGoal,
    questions: sanitizeQuestions(parsed.questions, guide),
    tokens,
  };
}
