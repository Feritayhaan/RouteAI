// Olay sayaçları (KV). Gün + olay tipi (+ görev / rehber / iyileştirme)
// HINCRBY; 7 günlük geri dönüş için günlük oturum-hash kümesi (30 gün TTL).
// Ham içerik, IP ve mesaj metni saklanmaz.

import { kv } from '../kv';
import { sessionHash } from '../signals/store';
import type { EventRequest } from './events';

export const EVENT_TTL_SECONDS = 120 * 24 * 60 * 60;
export const RETURN_TTL_SECONDS = 30 * 24 * 60 * 60;

export const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);
export const eventKeys = (day: string) => ({
  total: `ev:${day}`,
  task: `ev:${day}:task`,
  guide: `ev:${day}:guide`,
  refine: `ev:${day}:refine`,
  returning: `ret:${day}`,
});

export interface EventPipeline {
  hincrby(key: string, field: string, by: number): EventPipeline;
  sadd(key: string, member: string): EventPipeline;
  expire(key: string, seconds: number): EventPipeline;
  exec(): Promise<unknown[]>;
}
export interface EventStore {
  pipeline(): EventPipeline;
}

export async function recordEvent(e: EventRequest, now: number = Date.now(), store: EventStore = kv as unknown as EventStore): Promise<void> {
  const keys = eventKeys(dayOf(now));
  const p = store.pipeline();
  p.hincrby(keys.total, e.name, 1).expire(keys.total, EVENT_TTL_SECONDS);
  if (e.taskId) p.hincrby(keys.task, `${e.name}|${e.taskId}`, 1).expire(keys.task, EVENT_TTL_SECONDS);
  if (e.guideId) p.hincrby(keys.guide, `${e.name}|${e.guideId}|v${e.guideVersion ?? 0}`, 1).expire(keys.guide, EVENT_TTL_SECONDS);
  if (e.name === 'prompt_refined' && e.guideId && e.refinementId) p.hincrby(keys.refine, `${e.guideId}|${e.refinementId}`, 1).expire(keys.refine, EVENT_TTL_SECONDS);
  p.sadd(keys.returning, sessionHash(e.sessionId)).expire(keys.returning, RETURN_TTL_SECONDS);
  await p.exec();
}
