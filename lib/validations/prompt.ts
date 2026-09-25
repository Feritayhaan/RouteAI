import { z } from "zod";

const promptSessionId = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);
const slotId = z.string().regex(/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/).max(60);

/** Soru kartı cevapları: { slotId: optionId | 'auto' | serbest metin } */
export const promptAnswerSchema = z.object({
  promptSessionId,
  answers: z.record(slotId, z.string().trim().max(200)).refine((a) => Object.keys(a).length <= 3, "En fazla 3 cevap"),
});

/** Tam olarak biri: hazır buton, varsayım değişikliği ya da serbest talimat. */
export const promptRefineSchema = z.union([
  z.object({ promptSessionId, refinementId: z.string().regex(/^[a-z0-9-]{1,60}$/) }).strict(),
  z.object({ promptSessionId, slotId, value: z.string().trim().min(1).max(200) }).strict(),
  z.object({ promptSessionId, instruction: z.string().trim().min(2).max(500) }).strict(),
]);

/** Navigasyon arayüzünden prompt başlatma: ürün + kullanıcının amacı. */
export const promptStartSchema = z.object({
  productId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  goal: z.string().trim().min(2).max(1000),
  locale: z.enum(["en", "tr"]).default("tr"),
});
