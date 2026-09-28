// Üretim bağımlılıkları: OpenAI (OPENAI_PROMPT_MODEL), KV oturum deposu, katalog.

import { loadCatalog } from '../catalog/index';
import { loadGuides } from './guides';
import { isReasoningModel, openAIJsonLLM, promptModel } from './llm';
import { kvPromptStore, newPromptSessionId } from './store';
import type { PromptDeps } from './service';

/** /api/prompt/* için tur zaman aşımı (çıkarım + üretim + olası onarım). */
export const PROMPT_TIMEOUT_MS = 20_000;
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
