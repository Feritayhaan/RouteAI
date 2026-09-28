import type { NextRequest } from "next/server";
import { promptStartSchema } from "@/lib/validations/prompt";
import { startPromptSession } from "@/lib/promptBuilder/service";
import { handlePromptRequest } from "@/lib/promptBuilder/http";

// Navigasyon arayüzündeki prompt kutusu: ürün + amaç -> soru kartı ya da PromptCard.
// Ajan döngüsüne girmez; amaç metni tek kullanıcı mesajı olarak extract'e gider.
// Node: düşünen modelle (OPENAI_PROMPT_MODEL) tur 25 sn'yi aşabilir; edge'de yanıt
// 25 sn içinde başlamak zorunda. Zaman aşımı: lib/promptBuilder/deps.ts.
export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = "fra1";

export function POST(req: NextRequest) {
  return handlePromptRequest(
    req,
    promptStartSchema,
    ({ productId, goal, locale }, deps) =>
      startPromptSession({ productId, goal, locale, conversation: [{ role: "user", content: goal }] }, deps),
    "start"
  );
}
