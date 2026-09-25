// "İşini gördü mü?" soruları — RouteAI Skoru'nun ana veri kaynağı.
//
// Kullanıcı "Aracı aç"a tıklayınca tıklama saklanır. Sekmeye ≥ 2 dk sonra
// dönünce ya da sonraki ziyarette soru gösterilir. Aynı görevde iki farklı
// ürün açıldıysa iş sonucu yerine karşılaştırma sorulur. 7 günden eski
// tıklama düşer. Kullanıcıyı bunaltmamak için oturum başına en fazla 1 soru.

import type { KeyValueStore } from './storage';

export const PENDING_KEY = 'routeai:pending-outcomes';
export const ASKED_KEY = 'routeai:outcome-asked';
export const MIN_AWAY_MS = 2 * 60 * 1000;
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface ToolClick {
  productId: string;
  productName: string;
  taskId: string;
  clickedAt: number;
  /** Bu sohbette son kopyalanan prompt oturumu ve rehberi (P7). */
  promptSessionId?: string;
  guideId?: string;
  guideVersion?: number;
}

export type OutcomePrompt =
  | { kind: 'outcome'; click: ToolClick }
  | { kind: 'comparison'; taskId: string; a: ToolClick; b: ToolClick };

function read(store: KeyValueStore): ToolClick[] {
  try {
    const parsed = JSON.parse(store.get(PENDING_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.productId === 'string' && typeof c.clickedAt === 'number') : [];
  } catch {
    return [];
  }
}

function write(store: KeyValueStore, clicks: ToolClick[]) {
  store.set(PENDING_KEY, JSON.stringify(clicks));
}

export function recordToolClick(store: KeyValueStore, click: ToolClick): void {
  // Aynı ürün+görev tekrar tıklanırsa tek kayıt (en yeni tıklama).
  const rest = read(store).filter((c) => !(c.productId === click.productId && c.taskId === click.taskId));
  write(store, [...rest, click]);
}

/**
 * Şimdi sorulacak soru varsa döner. `requireAway`: sekmeye dönüşte (true)
 * tıklamanın üzerinden en az 2 dk geçmiş olmalı; sonraki ziyarette (false) gerekmez.
 */
export function dueOutcomePrompt(
  local: KeyValueStore,
  session: KeyValueStore,
  { now, requireAway }: { now: number; requireAway: boolean }
): OutcomePrompt | null {
  if (session.get(ASKED_KEY)) return null;
  const fresh = read(local).filter((c) => now - c.clickedAt <= MAX_AGE_MS);
  write(local, fresh);
  const ready = fresh.filter((c) => !requireAway || now - c.clickedAt >= MIN_AWAY_MS);
  if (ready.length === 0) return null;

  const newest = [...ready].sort((a, b) => b.clickedAt - a.clickedAt)[0];
  const sameTask = fresh
    .filter((c) => c.taskId === newest.taskId && c.productId !== newest.productId)
    .sort((a, b) => b.clickedAt - a.clickedAt);
  if (sameTask.length > 0) return { kind: 'comparison', taskId: newest.taskId, a: sameTask[0], b: newest };
  return { kind: 'outcome', click: newest };
}

/** Soru gösterildi: oturumda bir daha sorma; cevaplanan tıklamaları düşür. */
export function markOutcomeAsked(local: KeyValueStore, session: KeyValueStore, prompt: OutcomePrompt): void {
  session.set(ASKED_KEY, '1');
  const answered = prompt.kind === 'outcome' ? [prompt.click] : [prompt.a, prompt.b];
  write(local, read(local).filter((c) => !answered.some((a) => a.productId === c.productId && a.taskId === c.taskId)));
}
