// Sohbet akışındaki kartlar. Arayüz kartı modelin METNİNDEN değil, bu
// veriden çizer: ürün adı, puan, fiyat ve tarih sadece katalogdan gelir.

import { z } from 'zod';

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
  reasons: z.array(reasonSchema),
  pricing: z.record(z.unknown()),
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

/** P7'de dolacak; P6'da mock veriyle çizilir. */
export const promptCardSchema = z.object({
  type: z.literal('prompt'),
  productId: z.string(),
  productName: z.string(),
  productUrl: z.string().url().optional(),
  guideId: z.string(),
  guideVersion: z.number().int(),
  draft: z.boolean(),
  promptSessionId: z.string().optional(),
  prompt: z.string(),
  settings: z.array(z.object({ key: z.string(), value: z.string() })),
  howToUse: z.array(z.string()),
}).passthrough();
export type PromptCard = z.infer<typeof promptCardSchema>;

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
  workflowCardSchema,
]);
export type Card = z.infer<typeof cardSchema>;

/** NDJSON olayları. */
export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'card'; card: Card }
  | { type: 'done'; usage: { promptTokens: number; completionTokens: number; totalTokens: number }; fallback?: boolean }
  | { type: 'error'; code: string; retryAfter?: number };
