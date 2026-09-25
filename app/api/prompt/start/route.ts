import type { NextRequest } from "next/server";
import { promptStartSchema } from "@/lib/validations/prompt";
import { startPromptSession } from "@/lib/promptBuilder/service";
import { handlePromptRequest } from "@/lib/promptBuilder/http";

// Navigasyon arayüzündeki prompt kutusu: ürün + amaç -> soru kartı ya da PromptCard.
// Ajan döngüsüne girmez; amaç metni tek kullanıcı mesajı olarak extract'e gider.
export const runtime = "edge";
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
