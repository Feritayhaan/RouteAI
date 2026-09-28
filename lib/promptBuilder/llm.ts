// Prompt oluşturucunun OpenAI çağrısı: chat.completions + response_format
// json_schema (strict), lib/intent/parser.ts'teki gibi. Testte sahtesi verilir.
// Düşünen modeller (o-serisi, gpt-5) de desteklenir: bkz. buildChatRequest.

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

/**
 * Üretim çağrısının üst sınırı (iki varyant + varsayımlar + JSON). Sınıra
 * takılan yanıt yarım JSON olur ve prompt hiç çıkmaz; bu yüzden karmaşık
 * istekler (uygulama, uzun metin) için bol tutulur. Görsel/video/ses/müzik
 * 1000, metin/kod/sunum 1800. Düşünen modelde buna REASONING_ALLOWANCE
 * eklenir. Zaman aşımı: deps.ts promptTimeoutMs.
 */
export function maxTokensFor(modality: Modality): number {
  return ['image', 'video', 'audio', 'music', '3d'].includes(modality) ? 1000 : 1800;
}

/**
 * Düşünen (reasoning) modeller: o1/o3/o4… ailesi ve gpt-5 ailesi (sohbet
 * sürümü "gpt-5-chat…" hariç). Bunlar max_tokens ve temperature kabul etmez;
 * max_completion_tokens (düşünme token'ları dahil) ve reasoning_effort ister.
 */
export function isReasoningModel(model: string): boolean {
  const m = model.trim().toLowerCase().replace(/^openai\//, '');
  return /^o\d/.test(m) || (/^gpt-5/.test(m) && !m.includes('chat'));
}

export const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high'] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/** OPENAI_PROMPT_REASONING_EFFORT; boş ya da geçersizse 'low' (tüm düşünen modeller destekler, hızlı). */
export function promptReasoningEffort(): ReasoningEffort {
  const v = process.env.OPENAI_PROMPT_REASONING_EFFORT?.trim().toLowerCase();
  return (REASONING_EFFORTS as readonly string[]).includes(v ?? '') ? (v as ReasoningEffort) : 'low';
}

/** Düşünme için çıktı tavanına eklenen pay: düşünme token'ları da max_completion_tokens'a sayılır. */
export const REASONING_ALLOWANCE: Record<ReasoningEffort, number> = { none: 500, minimal: 1000, low: 4000, medium: 8000, high: 16000 };

/** chat.completions gövdesi: düşünen modelde developer rolü + max_completion_tokens + reasoning_effort. */
export function buildChatRequest(model: string, req: Omit<JsonRequest, 'signal'>, effort: ReasoningEffort = promptReasoningEffort()) {
  const { name, system, user, schema, maxTokens, temperature = 0.4 } = req;
  const reasoning = isReasoningModel(model);
  return {
    model,
    messages: [
      { role: reasoning ? ('developer' as const) : ('system' as const), content: system },
      { role: 'user' as const, content: user },
    ],
    response_format: { type: 'json_schema' as const, json_schema: { name, strict: true, schema } },
    ...(reasoning
      ? { max_completion_tokens: maxTokens + REASONING_ALLOWANCE[effort], reasoning_effort: effort }
      : { max_tokens: maxTokens, temperature }),
  };
}

export function openAIJsonLLM(model: string = promptModel()): JsonLLM {
  return async ({ signal, ...req }) => {
    const res = await getOpenAIClient().chat.completions.create({ ...buildChatRequest(model, req), stream: false }, { signal });
    const choice = res.choices[0];
    const content = choice?.message?.content;
    if (!content) throw new Error(choice?.finish_reason === 'length' ? 'token sınırı (düşünme dahil) doldu' : 'boş yanıt');
    return { data: JSON.parse(content), tokens: res.usage?.total_tokens ?? 0 };
  };
}
