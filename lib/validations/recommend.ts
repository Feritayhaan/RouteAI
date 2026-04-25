import { z } from "zod";

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
});

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;
