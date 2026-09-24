// /api/chat'in akış mantığı (HTTP'siz, test edilebilir). Route sadece rate
// limit + doğrulama yapar ve bunu çağırır.
//
// Sıra: bütçe kontrolü -> ajan (zaman aşımıyla) -> hata/zaman aşımı/bütçe
// durumunda v1 yedek yolu -> kullanım kaydı -> sayısal log -> 'done'.

import type { Task } from '../catalog/schema';
import type { SearchContext } from '../catalog/search';
import type { ChatEvent } from './cards';
import type { ChatClient } from './client';
import { isOverBudget, recordUsage, type UsageStore } from './budget';
import { FALLBACK_EMPTY, FALLBACK_NOTE, fallbackRecommendation } from './fallback';
import { runAgent, type AgentOutcome, type ConversationMessage } from './loop';
import type { BuildPromptFn } from './tools';

export interface ChatDeps {
  client: ChatClient;
  model: string;
  tasks: Task[];
  store: UsageStore;
  timeoutMs: number;
  search?: SearchContext;
  buildPrompt?: BuildPromptFn;
  /** Test için; varsayılan fallbackRecommendation. */
  fallback?: typeof fallbackRecommendation;
  log?: (line: string) => void;
}

export async function handleChat(
  input: { messages: ConversationMessage[]; locale: 'en' | 'tr' },
  deps: ChatDeps,
  emit: (e: ChatEvent) => void
): Promise<{ outcome: AgentOutcome | null; fallbackReason: string | null }> {
  const started = Date.now();
  const abort = new AbortController();
  let outcome: AgentOutcome | null = null;
  let fallbackReason: string | null = null;

  try {
    if (await isOverBudget(deps.store)) {
      fallbackReason = 'budget';
    } else {
      const timer = setTimeout(() => abort.abort(), deps.timeoutMs);
      try {
        outcome = await runAgent(
          input,
          { client: deps.client, model: deps.model, tasks: deps.tasks, search: deps.search, buildPrompt: deps.buildPrompt, signal: abort.signal },
          emit
        );
      } finally {
        clearTimeout(timer);
      }
    }
  } catch (error) {
    fallbackReason = abort.signal.aborted ? 'timeout' : 'openai_error';
    (deps.log ?? console.error)(`[chat] ajan hatası: ${error instanceof Error ? error.name : 'unknown'}`);
  }

  if (fallbackReason) {
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    try {
      const card = await (deps.fallback ?? fallbackRecommendation)(lastUser);
      emit({ type: 'text', delta: (card ? FALLBACK_NOTE : FALLBACK_EMPTY)[input.locale] });
      if (card) emit({ type: 'card', card });
    } catch {
      emit({ type: 'error', code: 'unavailable' });
    }
  }

  const usage = outcome?.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  await recordUsage(deps.store, usage.totalTokens);

  // Sadece sayılar: görev, araç çağrıları, gecikme, token. Mesaj metni YOK.
  (deps.log ?? console.log)(`[chat] ${JSON.stringify({
    taskId: outcome?.taskId ?? null,
    toolCalls: outcome?.toolCalls ?? {},
    endedWith: outcome?.endedWith ?? null,
    latencyMs: Date.now() - started,
    tokens: usage.totalTokens,
    fallback: fallbackReason,
  })}`);

  emit({ type: 'done', usage, ...(fallbackReason ? { fallback: true } : {}) });
  return { outcome, fallbackReason };
}
