import { z } from "zod";

export const feedbackRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Sorgu boş olamaz")
    .max(500, "Sorgu en fazla 500 karakter olabilir"),
  toolName: z
    .string()
    .trim()
    .min(1, "Araç adı boş olamaz")
    .max(120, "Araç adı en fazla 120 karakter olabilir"),
  vote: z.enum(["up", "down"]),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

/** KV'de fb:* anahtarlarında duran kayıt. */
export interface FeedbackRecord {
  query: string;
  toolName: string;
  vote: "up" | "down";
  ts: number;
}
