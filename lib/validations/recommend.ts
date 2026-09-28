import { z } from "zod";
import { taskIdSchema } from "../catalog/schema";

export const recommendRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Sorgunuz en az 3 karakter olmalı")
    .max(500, "Sorgunuz en fazla 500 karakter olabilir"),
  pricingFilter: z
    .enum(["all", "free", "paid"])
    .optional()
    .default("all"),
  // v3 clarify: kullanıcı "Şunu mu demek istedin?" seçeneklerinden birini seçti.
  // Sadece RECOMMENDER=v3'te okunur; v1 yok sayar.
  taskId: taskIdSchema.max(64).optional(),
});

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;
