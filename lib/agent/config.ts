// Sohbet ajanının sabitleri. Model ve bütçe ortam değişkeninden gelir.

/** OPENAI_MODEL tanımsızsa kullanılan model (README'de yazılı). */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export function agentModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

/** Tur başına en fazla araç çağrısı. */
export const MAX_TOOL_CALLS = 6;
/** Tur başına en fazla model çağrısı (sonsuz döngü koruması). */
export const MAX_MODEL_ROUNDS = 8;
/** Bir konuşmada en fazla netleştirme sorusu. */
export const MAX_QUESTIONS = 2;
export const TEMPERATURE = 0.2;
export const MAX_OUTPUT_TOKENS = 700;
/** Tüm tur için zaman aşımı; aşılırsa v1 yoluna düşülür. */
export const AGENT_TIMEOUT_MS = 15_000;
/** Modele gönderilen en fazla geçmiş mesaj. */
export const MAX_HISTORY = 20;
