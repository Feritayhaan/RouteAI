import { z } from "zod";

// İki biçim kabul edilir:
//  - v1 (klasik arayüz): { query, toolName, vote }
//  - v2 (sohbet):        { sessionId, taskId, productId, toolName, vote } — mesaj metni YOK
export const feedbackRequestSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1, "Sorgu boş olamaz")
      .max(500, "Sorgu en fazla 500 karakter olabilir")
      .optional(),
    toolName: z
      .string()
      .trim()
      .min(1, "Araç adı boş olamaz")
      .max(120, "Araç adı en fazla 120 karakter olabilir"),
    vote: z.enum(["up", "down"]),
    sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/, "Geçersiz sessionId").optional(),
    taskId: z.string().regex(/^[a-z0-9]+\.[a-z0-9-]+$/, "Geçersiz taskId").optional(),
    productId: z.string().regex(/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/, "Geçersiz productId").max(100).optional(),
  })
  .refine(
    (f) => Boolean(f.query) || Boolean(f.sessionId && f.taskId && f.productId),
    "query ya da sessionId + taskId + productId gerekli"
  );

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

/** KV'de fb:* anahtarlarında duran kayıt. */
export interface FeedbackRecord {
  /** Sadece v1 (klasik) kayıtlarında. */
  query?: string;
  toolName: string;
  vote: "up" | "down";
  ts: number;
  taskId?: string;
  productId?: string;
  /** Oturum kimliğinin hash'i (ham kimlik saklanmaz). */
  sessionHash?: string;
}
