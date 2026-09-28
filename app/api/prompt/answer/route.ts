import type { NextRequest } from "next/server";
import { promptAnswerSchema } from "@/lib/validations/prompt";
import { answerPromptQuestions } from "@/lib/promptBuilder/service";
import { handlePromptRequest } from "@/lib/promptBuilder/http";

// Prompt soru kartının cevabı -> PromptCard. Ajan döngüsüne girmez (daha ucuz ve hızlı).
// Node: düşünen modelle (OPENAI_PROMPT_MODEL) tur 25 sn'yi aşabilir; edge'de yanıt
// 25 sn içinde başlamak zorunda. Zaman aşımı: lib/promptBuilder/deps.ts.
export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = "fra1";

export function POST(req: NextRequest) {
  return handlePromptRequest(req, promptAnswerSchema, (input, deps) => answerPromptQuestions(input, deps), "answer");
}
