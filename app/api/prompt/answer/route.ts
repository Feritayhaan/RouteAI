import type { NextRequest } from "next/server";
import { promptAnswerSchema } from "@/lib/validations/prompt";
import { answerPromptQuestions } from "@/lib/promptBuilder/service";
import { handlePromptRequest } from "@/lib/promptBuilder/http";

// Prompt soru kartının cevabı -> PromptCard. Ajan döngüsüne girmez (daha ucuz ve hızlı).
export const runtime = "edge";
export const preferredRegion = "fra1";

export function POST(req: NextRequest) {
  return handlePromptRequest(req, promptAnswerSchema, (input, deps) => answerPromptQuestions(input, deps), "answer");
}
