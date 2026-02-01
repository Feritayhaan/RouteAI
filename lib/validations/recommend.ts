import { z } from "zod";

export const recommendRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Prompt must be at least 3 characters")
    .max(500, "Prompt must be at most 500 characters"),
  pricingFilter: z
    .enum(["all", "free", "paid"])
    .optional()
    .default("all"),
});

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;
