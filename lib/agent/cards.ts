// Sohbet akışındaki kartlar. Arayüz kartı modelin METNİNDEN değil, bu
// veriden çizer: ürün adı, puan, fiyat ve tarih sadece katalogdan gelir.

import { z } from 'zod';
import { toolPricingSchema } from '../catalog/schema';

const reasonSchema = z.object({ code: z.string(), params: z.record(z.unknown()) });

export const cardSourceSchema = z.object({
  /** 'lmarena' | 'artificialanalysis' | 'routeai-users' | 'routeai-expert' */
  id: z.string(),
  label: z.string(),
  url: z.string().url().optional(),
});

export const recommendationItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  url: z.string().url(),
  /** v1 yedek yolunda puan yok: null. */
  q: z.number().nullable(),
  confidence: z.enum(['high', 'medium', 'low']).nullable(),
  ownN: z.number().nullable(),
  benchmarkShare: z.number().nullable(),
  /** Kanıt payları (0–1): kullanıcı sonuçları, uzman, benchmark. v1 yedeğinde null. */
  shares: z.object({ users: z.number(), expert: z.number(), benchmark: z.number() }).nullable(),
  reasons: z.array(reasonSchema),
  pricing: toolPricingSchema,
  dataDate: z.string().nullable(),
  sources: z.array(cardSourceSchema),
});
export type RecommendationItem = z.infer<typeof recommendationItemSchema>;

export const recommendationCardSchema = z.object({
  type: z.literal('recommendation'),
  /** 'catalog' = RouteAI Skoru; 'fallback' = v1 anahtar kelime yolu (ajan erişilemedi). */
  mode: z.enum(['catalog', 'fallback']),
  taskId: z.string().nullable(),
  items: z.array(recommendationItemSchema),
  noEvidence: z.boolean(),
  relaxedConstraint: z.array(z.string()).optional(),
});
export type RecommendationCard = z.infer<typeof recommendationCardSchema>;

export const questionCardSchema = z.object({
  type: z.literal('question'),
  question: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).min(2).max(4),
  allowFreeText: z.boolean(),
});
export type QuestionCard = z.infer<typeof questionCardSchema>;

/** Prompt oluşturucunun (P7) kartı: iki varyant, varsayımlar, iyileştirmeler. */
export const promptCardSchema = z.object({
  type: z.literal('prompt'),
  promptSessionId: z.string(),
  productId: z.string(),
  productName: z.string(),
  productUrl: z.string().url().optional(),
  guideId: z.string(),
  guideVersion: z.number().int(),
  /** Rehber henüz gözden geçirilmedi ("Taslak rehber"). */
  draft: z.boolean(),
  versionN: z.number().int().positive(),
  variants: z.array(z.object({
    id: z.enum(['safe', 'creative']),
    prompt: z.string(),
    negativePrompt: z.string().nullable(),
    settings: z.array(z.object({ key: z.string(), value: z.string() })),
    validation: z.object({ status: z.enum(['passed', 'unchecked']), errors: z.array(z.string()) }),
  })).min(1),
  /** Kullanıcının söylemediği her şey; tıklanınca seçenekler açılır. */
  assumptions: z.array(z.object({
    slotId: z.string(),
    value: z.string(),
    why: z.string(),
    question: z.string(),
    options: z.array(z.object({ id: z.string(), label: z.string(), value: z.string() })),
  })),
  refinements: z.array(z.object({
    id: z.string(),
    label: z.string(),
    kind: z.enum(['guide', 'suggested']),
    slotId: z.string().nullable(),
    value: z.string().nullable(),
    instruction: z.string().nullable(),
  })),
  howToUse: z.array(z.string()),
  filledBy: z.object({ user: z.number(), inferred: z.number(), default: z.number() }),
  refinementsLeft: z.number().int().nonnegative(),
});
export type PromptCard = z.infer<typeof promptCardSchema>;

/** Prompt için eksik bilgiler: tek kart, en fazla 3 soru. */
export const promptQuestionCardSchema = z.object({
  type: z.literal('prompt_question'),
  promptSessionId: z.string(),
  guideId: z.string(),
  productName: z.string(),
  questions: z.array(z.object({
    slotId: z.string(),
    question: z.string(),
    options: z.array(z.object({ id: z.string(), label: z.string() })),
    allowFreeText: z.boolean(),
  })).min(1).max(3),
});
export type PromptQuestionCard = z.infer<typeof promptQuestionCardSchema>;

export const workflowCardSchema = z.object({
  type: z.literal('workflow'),
  templateId: z.string(),
  name: z.string(),
  estimatedDuration: z.string(),
  steps: z.array(z.object({
    order: z.number(),
    name: z.string(),
    description: z.string(),
    taskId: z.string(),
    product: z.object({
      productId: z.string(),
      name: z.string(),
      url: z.string().url(),
      q: z.number(),
      confidence: z.enum(['high', 'medium', 'low']),
    }).nullable(),
    promptTemplate: z.string().nullable(),
  })),
});
export type WorkflowCard = z.infer<typeof workflowCardSchema>;

export const cardSchema = z.discriminatedUnion('type', [
  recommendationCardSchema,
  questionCardSchema,
  promptCardSchema,
  promptQuestionCardSchema,
  workflowCardSchema,
]);
export type Card = z.infer<typeof cardSchema>;

/** NDJSON olayları. */
export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'card'; card: Card }
  | { type: 'done'; usage: { promptTokens: number; completionTokens: number; totalTokens: number }; fallback?: boolean }
  | { type: 'error'; code: string; retryAfter?: number };
