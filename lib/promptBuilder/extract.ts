// Konuşmadan slot değerlerini çıkarır: TEK OpenAI çağrısı (json_schema strict).
// Sadece söylenen ya da güçlü şekilde ima edilen bilgi; tahmin gerekiyorsa null.

import { z } from 'zod';
import type { Guide } from './guideSchema';
import type { JsonLLM } from './llm';

export interface ExtractedSlot {
  value: string | null;
  source: 'user' | 'inferred';
  confidence: number;
}

export interface Extraction {
  slots: Record<string, ExtractedSlot>;
  goalSummary: string;
  tokens: number;
}

const outputSchema = z.object({
  slots: z.array(z.object({
    id: z.string(),
    value: z.string().nullable(),
    source: z.enum(['user', 'inferred']),
    confidence: z.number(),
  })),
  goalSummary: z.string(),
});

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
  const slotSpec = guide.slots.map((s) => ({
    id: s.id,
    question: s.question.en,
    options: s.options.map((o) => o.value),
  }));
  const system = `You extract details for building a prompt for an AI tool. For each slot, fill a value ONLY if the conversation states it or strongly implies it. If you would have to guess, return null.
- source "user": the user said it explicitly; "inferred": strongly implied.
- confidence: 0-1, how sure you are.
- Prefer one of the slot's option values when it matches; otherwise a short free-text value (max 12 words).
- goalSummary: one sentence in ${locale === 'tr' ? 'Turkish' : 'English'} describing what the user wants to create.
Return every slot id exactly once.`;
  const user = JSON.stringify({
    goal,
    slots: slotSpec,
    conversation: conversation.slice(-12).map((m) => `${m.role}: ${m.content}`).join('\n'),
  });
  const { data, tokens } = await llm({
    name: 'slot_extraction',
    system,
    user,
    maxTokens: 500,
    temperature: 0,
    signal,
    schema: {
      type: 'object',
      properties: {
        slots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', enum: guide.slots.map((s) => s.id) },
              value: { type: ['string', 'null'] },
              source: { type: 'string', enum: ['user', 'inferred'] },
              confidence: { type: 'number' },
            },
            required: ['id', 'value', 'source', 'confidence'],
            additionalProperties: false,
          },
        },
        goalSummary: { type: 'string' },
      },
      required: ['slots', 'goalSummary'],
      additionalProperties: false,
    },
  });

  const parsed = outputSchema.parse(data);
  const known = new Set(guide.slots.map((s) => s.id));
  const slots: Record<string, ExtractedSlot> = {};
  for (const s of parsed.slots) {
    if (!known.has(s.id) || s.id in slots) continue;
    const value = s.value?.trim() ? s.value.trim().slice(0, 200) : null;
    slots[s.id] = { value, source: s.source, confidence: Math.max(0, Math.min(1, s.confidence)) };
  }
  return { slots, goalSummary: parsed.goalSummary.slice(0, 300), tokens };
}
