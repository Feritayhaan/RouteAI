// Prompt oluşturucunun OpenAI çağrısı: chat.completions + response_format
// json_schema (strict), lib/intent/parser.ts'teki gibi. Testte sahtesi verilir.

import { getOpenAIClient } from '../openai';
import { agentModel } from '../agent/config';
import type { Modality } from '../catalog/schema';

export interface JsonRequest {
  name: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  temperature?: number;
  signal?: AbortSignal;
}

export type JsonLLM = (req: JsonRequest) => Promise<{ data: unknown; tokens: number }>;

/** OPENAI_PROMPT_MODEL, yoksa OPENAI_MODEL, yoksa ajanın varsayılanı. */
export function promptModel(): string {
  return process.env.OPENAI_PROMPT_MODEL?.trim() || agentModel();
}

/** Görsel/video/ses/müzik 600, metin/kod/sunum 1200. */
export function maxTokensFor(modality: Modality): number {
  return ['image', 'video', 'audio', 'music', '3d'].includes(modality) ? 600 : 1200;
}

export function openAIJsonLLM(model: string = promptModel()): JsonLLM {
  return async ({ name, system, user, schema, maxTokens, temperature = 0.4, signal }) => {
    const res = await getOpenAIClient().chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
        temperature,
        max_tokens: maxTokens,
      },
      { signal }
    );
    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error('boş yanıt');
    return { data: JSON.parse(content), tokens: res.usage?.total_tokens ?? 0 };
  };
}
