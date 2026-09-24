// Kendi gözlemlerimizin KV kayıtları (RouteAI Skoru'nun ana verisi).
//
// Anahtarlar oturum kimliğinin HASH'iyle kurulur; ham oturum kimliği, IP ve
// mesaj metni saklanmaz. Aynı oturum + ürün + görev için tek kayıt: son
// cevap öncekinin üzerine yazar (bir oturumun etkisi 1 gözlemle sınırlı).
// Toplama (data/signals.json) P8'deki scripts/aggregate-signals.mjs'in işi.

import { kv } from '../kv';
import { hashString } from '../hash';
import type { OutcomeRequest } from '../validations/outcome';

export const OUTCOME_INDEX = 'sig:outcome:index';
export const COMPARISON_INDEX = 'sig:comparison:index';
export const VOTE_INDEX = 'sig:vote:index';
/** Kayıtlar ~13 ay tutulur; toplama gece çalışır. */
export const SIGNAL_TTL_SECONDS = 400 * 24 * 60 * 60;

export interface SignalKv {
  set(key: string, value: unknown, opts: { ex: number }): Promise<unknown>;
  sadd(key: string, member: string): Promise<unknown>;
}

/** 64 bit (iki FNV-1a) — 32 bit'te farklı oturumlar çakışabilirdi. */
export function sessionHash(sessionId: string): string {
  return `${hashString(`routeai-session-a:${sessionId}`)}${hashString(`routeai-session-b:${sessionId}`)}`;
}

export function outcomeKey(sessionId: string, taskId: string, productId: string): string {
  return `sig:outcome:${sessionHash(sessionId)}:${taskId}:${productId}`;
}

/** Çift sırasız: A/B ile B/A aynı kayıt. */
export function comparisonKey(sessionId: string, taskId: string, a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `sig:comparison:${sessionHash(sessionId)}:${taskId}:${x}:${y}`;
}

export async function saveOutcome(req: OutcomeRequest, now: number = Date.now(), store: SignalKv = kv as unknown as SignalKv): Promise<string> {
  const at = new Date(now).toISOString();
  if (req.kind === 'outcome') {
    const key = outcomeKey(req.sessionId, req.taskId, req.productId);
    await store.set(key, { taskId: req.taskId, productId: req.productId, answer: req.answer, tags: req.tags, promptSessionId: req.promptSessionId ?? null, at }, { ex: SIGNAL_TTL_SECONDS });
    await store.sadd(OUTCOME_INDEX, key);
    return key;
  }
  const key = comparisonKey(req.sessionId, req.taskId, req.productA, req.productB);
  await store.set(key, { taskId: req.taskId, a: req.productA, b: req.productB, winner: req.winner, at }, { ex: SIGNAL_TTL_SECONDS });
  await store.sadd(COMPARISON_INDEX, key);
  return key;
}
