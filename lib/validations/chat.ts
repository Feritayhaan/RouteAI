import { z } from "zod";

// /api/chat isteği. Mesaj metni doğrulanır ama hiçbir yerde saklanmaz/loglanmaz.
export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
        kind: z.enum(["text", "question", "recommendation", "workflow", "prompt"]).optional(),
      })
    )
    .min(1)
    .max(60)
    .refine((m) => m[m.length - 1].role === "user", "Son mesaj kullanıcıdan olmalı")
    .transform((m) => m.slice(-20)),
  locale: z.enum(["en", "tr"]).optional(),
  /** İstemcinin ürettiği anonim kimlik. */
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/, "Geçersiz sessionId"),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
