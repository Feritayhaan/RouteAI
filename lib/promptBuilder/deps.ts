// Üretim bağımlılıkları: OpenAI (OPENAI_PROMPT_MODEL), KV oturum deposu, katalog.

import { loadCatalog } from '../catalog/index';
import { loadGuides } from './guides';
import { isReasoningModel, openAIJsonLLM, promptModel } from './llm';
import { kvPromptStore, newPromptSessionId } from './store';
import type { PromptDeps } from './service';

/**
 * /api/prompt/* için tur zaman aşımı (çıkarım + üretim + olası onarım).
 * 2026-10-14: 20 -> 40 sn (Ferit kararı). Uzun sunum promptunda (gamma-full)
 * onarım turuyla birlikte istek 20-21 sn sürüp hata veriyordu; beklemek hata
 * ekranından iyidir. Route maxDuration 60 sn altında kalır.
 */
export const PROMPT_TIMEOUT_MS = 40_000;
/**
 * Düşünen modelde (o-serisi, gpt-5) aynı tur daha uzun sürer. Prompt uçları
 * bu yüzden Node çalışma zamanında, maxDuration 60 sn (app/api/prompt/*).
 */
export const REASONING_PROMPT_TIMEOUT_MS = 50_000;

export function promptTimeoutMs(model: string = promptModel()): number {
  return isReasoningModel(model) ? REASONING_PROMPT_TIMEOUT_MS : PROMPT_TIMEOUT_MS;
}

export function defaultPromptDeps(signal?: AbortSignal): PromptDeps {
  const catalog = loadCatalog();
  return {
    llm: openAIJsonLLM(),
    store: kvPromptStore(),
    guides: loadGuides(),
    products: catalog.products,
    tasksById: catalog.tasksById,
    now: Date.now,
    newId: newPromptSessionId,
    signal,
  };
}
