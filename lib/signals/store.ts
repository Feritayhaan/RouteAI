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

export function voteKey(sessionId: string, taskId: string, productId: string): string {
  return `sig:vote:${sessionHash(sessionId)}:${taskId}:${productId}`;
}

/** KV'deki kayıt biçimleri (aggregate-signals ve stats okur). */
export interface OutcomeRecord { taskId: string; productId: string; answer: 'yes' | 'partial' | 'no'; tags: string[]; promptSessionId: string | null; guideId: string | null; guideVersion: number | null; at: string }
export interface ComparisonRecord { taskId: string; a: string; b: string; winner: string; at: string }
export interface VoteRecord { taskId: string; productId: string; toolName: string; vote: 'up' | 'down'; ts: number; sessionHash: string; at: string }

export async function saveOutcome(req: OutcomeRequest, now: number = Date.now(), store: SignalKv = kv as unknown as SignalKv): Promise<string> {
  const at = new Date(now).toISOString();
  if (req.kind === 'outcome') {
    const key = outcomeKey(req.sessionId, req.taskId, req.productId);
    const record: OutcomeRecord = {
      taskId: req.taskId, productId: req.productId, answer: req.answer, tags: req.tags,
      promptSessionId: req.promptSessionId ?? null, guideId: req.guideId ?? null, guideVersion: req.guideVersion ?? null, at,
    };
    await store.set(key, record, { ex: SIGNAL_TTL_SECONDS });
    await store.sadd(OUTCOME_INDEX, key);
    return key;
  }
  const key = comparisonKey(req.sessionId, req.taskId, req.productA, req.productB);
  const record: ComparisonRecord = { taskId: req.taskId, a: req.productA, b: req.productB, winner: req.winner, at };
  await store.set(key, record, { ex: SIGNAL_TTL_SECONDS });
  await store.sadd(COMPARISON_INDEX, key);
  return key;
}

/**
 * Sohbetteki öneri oyu: oturum + ürün + görev başına tek kayıt (son oy geçerli).
 * Admin listesi (fb:recent) de bu anahtarı görür.
 */
export async function saveVote(
  v: { sessionId: string; taskId: string; productId: string; toolName: string; vote: 'up' | 'down' },
  now: number = Date.now(),
  store: SignalKv & { lpush?: (k: string, v: string) => Promise<unknown>; ltrim?: (k: string, a: number, b: number) => Promise<unknown> } = kv as unknown as SignalKv
): Promise<string> {
  const key = voteKey(v.sessionId, v.taskId, v.productId);
  const record: VoteRecord = { taskId: v.taskId, productId: v.productId, toolName: v.toolName, vote: v.vote, ts: now, sessionHash: sessionHash(v.sessionId), at: new Date(now).toISOString() };
  await store.set(key, record, { ex: SIGNAL_TTL_SECONDS });
  await store.sadd(VOTE_INDEX, key);
  return key;
}
