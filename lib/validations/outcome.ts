import { z } from "zod";

const id = z.string().regex(/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/).max(100);
const taskId = z.string().regex(/^[a-z0-9]+\.[a-z0-9-]+$/).max(100);
const sessionId = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);

export const OUTCOME_TAGS = ["expensive", "hard", "quality", "limit", "language", "other"] as const;

/** "İşini gördü mü?" cevabı. Serbest metin YOK: sadece etiketler. */
export const outcomeAnswerSchema = z.object({
  kind: z.literal("outcome"),
  sessionId,
  taskId,
  productId: id,
  answer: z.enum(["yes", "partial", "no"]),
  tags: z.array(z.enum(OUTCOME_TAGS)).max(OUTCOME_TAGS.length).default([]),
  /** Bu sohbette son kopyalanan prompt oturumu (P7: rehber sürümü başına başarı). */
  promptSessionId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/).optional(),
  /** Kopyalanan promptun rehberi ve sürümü: rehber sürümü başına "işini gördü" oranı. */
  guideId: id.optional(),
  guideVersion: z.number().int().positive().optional(),
});

/** "Hangisi daha iyiydi?" cevabı. */
export const comparisonAnswerSchema = z
  .object({
    kind: z.literal("comparison"),
    sessionId,
    taskId,
    productA: id,
    productB: id,
    winner: z.union([id, z.literal("tie")]),
  })
  .refine((c) => c.productA !== c.productB, "İki farklı ürün olmalı")
  .refine((c) => c.winner === "tie" || c.winner === c.productA || c.winner === c.productB, "Kazanan iki üründen biri olmalı");

export const outcomeRequestSchema = z.union([outcomeAnswerSchema, comparisonAnswerSchema]);
export type OutcomeRequest = z.infer<typeof outcomeRequestSchema>;
