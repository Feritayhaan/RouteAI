// Üretim bağımlılıkları: OpenAI (OPENAI_PROMPT_MODEL), KV oturum deposu, katalog.

import { loadCatalog } from '../catalog/index';
import { loadGuides } from './guides';
import { openAIJsonLLM } from './llm';
import { kvPromptStore, newPromptSessionId } from './store';
import type { PromptDeps } from './service';

/** /api/prompt/* için tur zaman aşımı. */
export const PROMPT_TIMEOUT_MS = 20_000;

export function defaultPromptDeps(signal?: AbortSignal): PromptDeps {
  return {
    llm: openAIJsonLLM(),
    store: kvPromptStore(),
    guides: loadGuides(),
    products: loadCatalog().products,
    now: Date.now,
    newId: newPromptSessionId,
    signal,
  };
}
