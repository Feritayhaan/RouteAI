// /api/prompt/start, /api/prompt/answer ve /api/prompt/refine istemcisi.

import type { PromptCard, PromptQuestionCard } from '../agent/cards';

export type PromptApiResult = { card: PromptCard } | { error: string };

async function post(url: string, body: unknown): Promise<PromptApiResult> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.card?.type === 'prompt') return { card: json.card as PromptCard };
    return { error: typeof json?.error === 'string' ? json.error : `http_${res.status}` };
  } catch {
    return { error: 'network' };
  }
}

export const answerPromptQuestions = (promptSessionId: string, answers: Record<string, string>) =>
  post('/api/prompt/answer', { promptSessionId, answers });

export type RefineRequest = { refinementId: string } | { slotId: string; value: string } | { instruction: string };

export const refinePrompt = (promptSessionId: string, action: RefineRequest) =>
  post('/api/prompt/refine', { promptSessionId, ...action });

export type PromptStartResult = { card: PromptCard | PromptQuestionCard } | { error: string };

/** Navigasyon arayüzünün prompt kutusu: soru kartı ya da doğrudan PromptCard döner. */
export async function startPrompt(productId: string, goal: string, locale: 'en' | 'tr'): Promise<PromptStartResult> {
  try {
    const res = await fetch('/api/prompt/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, goal, locale }) });
    const json = await res.json().catch(() => ({}));
    const type = json?.card?.type;
    if (res.ok && (type === 'prompt' || type === 'prompt_question')) return { card: json.card };
    return { error: typeof json?.error === 'string' ? json.error : `http_${res.status}` };
  } catch {
    return { error: 'network' };
  }
}
