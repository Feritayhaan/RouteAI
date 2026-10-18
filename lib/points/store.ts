// Gizli kullanıcı puanının KV tarafı (lib/points/points.ts formülü).
//
// Saklama: görev başına tek hash. Anahtar `pts:<görev>`, alanlar `<ürün>|up` ve
// `<ürün>|down` (HINCRBY sayaçları). Oy kaydının kendisi (oturum hash'iyle)
// lib/signals/store.ts → saveVote'ta; puan oradan çağrılır. Böylece:
//  - oturum + ürün + görev başına tek oy (son oy geçerli) kuralı aynen sürer;
//  - oy değişince eski yön bir azalır, yeni yön bir artar (idempotent: aynı oy
//    tekrar gelirse sayaçlar oynamaz).
// Hiçbir şey silinmez ya da sıfırlanmaz; sayaçlar scripts/backfill-points.mjs ile
// oy kayıtlarından yeniden hesaplanabilir (varsayılan: sadece göster).
//
// Okuma güvenlidir: KV yanıt vermezse ya da yavaşsa sıralama puansız (eski)
// haliyle devam eder; kullanıcı hata görmez.

import { kv } from '../kv';
import { START_POINTS, pointsFromVotes, rankingPoints, totalVotes, type VoteCounts } from './points';

export type VoteDirection = 'up' | 'down';

export const pointsKey = (taskId: string): string => `pts:${taskId}`;
const fieldOf = (productId: string, direction: VoteDirection): string => `${productId}|${direction}`;

/** Yazma için gereken KV parçası (testte sahtesi verilir). */
export interface PointsWriteKv {
  hincrby(key: string, field: string, increment: number): Promise<unknown>;
}

/** Okuma için gereken KV parçası. */
export interface PointsReadKv {
  hgetall(key: string): Promise<Record<string, unknown> | null>;
}

export function isVoteDirection(value: unknown): value is VoteDirection {
  return value === 'up' || value === 'down';
}

/**
 * Bir oyu sayaçlara işler. previous: aynı oturumun bu çift için önceki oyu
 * (yoksa null). Aynı yön tekrarlanırsa hiçbir şey yapmaz.
 */
export async function applyVoteToPoints(
  store: PointsWriteKv,
  v: { taskId: string; productId: string; vote: VoteDirection; previous: VoteDirection | null }
): Promise<void> {
  if (v.previous === v.vote) return;
  const key = pointsKey(v.taskId);
  const writes = [store.hincrby(key, fieldOf(v.productId, v.vote), 1)];
  if (v.previous) writes.push(store.hincrby(key, fieldOf(v.productId, v.previous), -1));
  await Promise.all(writes);
}

/** Hash içeriği -> ürün başına oy sayıları. Bozuk ya da negatif değerler 0 sayılır. */
export function parseCounts(raw: Record<string, unknown> | null | undefined): Map<string, VoteCounts> {
  const counts = new Map<string, VoteCounts>();
  if (!raw) return counts;
  for (const [field, value] of Object.entries(raw)) {
    const [productId, direction] = field.split('|');
    if (!productId || !isVoteDirection(direction)) continue;
    const n = Number(value);
    const entry = counts.get(productId) ?? { up: 0, down: 0 };
    entry[direction] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    counts.set(productId, entry);
  }
  return counts;
}

export async function loadTaskCounts(taskId: string, store: PointsReadKv = kv as unknown as PointsReadKv): Promise<Map<string, VoteCounts>> {
  return parseCounts(await store.hgetall(pointsKey(taskId)));
}

/**
 * Öneri motorunun kullandığı sağlayıcı: görev -> (ürün -> sıralama puanı).
 * Listede olmayan ürün 500 sayılır. Hata ya da zaman aşımında boş harita döner.
 */
export interface PointsProvider {
  load(taskId: string): Promise<Map<string, number>>;
}

export const POINTS_READ_TIMEOUT_MS = 800;

export function kvPointsProvider(store: PointsReadKv = kv as unknown as PointsReadKv, timeoutMs: number = POINTS_READ_TIMEOUT_MS): PointsProvider {
  return {
    async load(taskId) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const counts = await Promise.race([
          loadTaskCounts(taskId, store),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('puan okuma zaman aşımı')), timeoutMs);
          }),
        ]);
        return new Map([...counts].map(([productId, c]) => [productId, rankingPoints(c)]));
      } catch (error) {
        // Kullanıcı metni ya da kimlik değil, yalnızca görev id'si loglanır.
        console.error(`[points] ${taskId} puanları okunamadı, puansız sıralama kullanılacak:`, error instanceof Error ? error.message : error);
        return new Map();
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

/** Yönetici görünümü: bir görevdeki ürünlerin ham puanı, oy sayıları ve sıralamada sayılıp sayılmadığı. */
export interface PointsRow {
  taskId: string;
  productId: string;
  up: number;
  down: number;
  votes: number;
  points: number;
  /** Sıralamada kullanılan puan (yeterli oy yoksa 500). */
  rankingPoints: number;
}

export async function listPoints(taskIds: string[], store: PointsReadKv = kv as unknown as PointsReadKv): Promise<PointsRow[]> {
  const perTask = await Promise.all(taskIds.map(async (taskId) => ({ taskId, counts: await loadTaskCounts(taskId, store) })));
  const rows: PointsRow[] = [];
  for (const { taskId, counts } of perTask) {
    for (const [productId, c] of counts) {
      if (totalVotes(c) === 0) continue;
      rows.push({ taskId, productId, up: c.up, down: c.down, votes: totalVotes(c), points: pointsFromVotes(c), rankingPoints: rankingPoints(c) });
    }
  }
  return rows.sort((a, b) => a.taskId.localeCompare(b.taskId) || b.points - a.points || a.productId.localeCompare(b.productId));
}

export { START_POINTS };
