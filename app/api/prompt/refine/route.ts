import type { NextRequest } from "next/server";
import { promptRefineSchema } from "@/lib/validations/prompt";
import { refinePromptSession } from "@/lib/promptBuilder/service";
import { handlePromptRequest } from "@/lib/promptBuilder/http";

// Prompt iyileştirme: hazır buton | varsayım değişikliği | serbest talimat -> yeni PromptCard.
export const runtime = "edge";
export const preferredRegion = "fra1";

export function POST(req: NextRequest) {
  return handlePromptRequest(req, promptRefineSchema, (input, deps) => refinePromptSession(input, deps), "refine");
}
