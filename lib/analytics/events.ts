// Analitik olayları: isimler ve izin verilen alanlar. Serbest metin YOK.

import { z } from 'zod';

export const EVENT_NAMES = [
  'chat_start', 'clarify_shown', 'recommendation_shown', 'tool_click', 'prompt_copy', 'feedback',
  'outcome_shown', 'outcome_answered', 'comparison_answered',
  'prompt_question_shown', 'prompt_generated', 'prompt_refined', 'prompt_copied',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export const eventRequestSchema = z.object({
  name: z.enum(EVENT_NAMES),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  taskId: z.string().regex(/^[a-z0-9]+\.[a-z0-9-]+$/).optional(),
  guideId: z.string().regex(/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/).max(60).optional(),
  guideVersion: z.number().int().positive().max(10000).optional(),
  refinementId: z.string().regex(/^[a-z0-9_-]{1,60}$/).optional(),
  variant: z.enum(['safe', 'creative']).optional(),
}).strict();
export type EventRequest = z.infer<typeof eventRequestSchema>;
