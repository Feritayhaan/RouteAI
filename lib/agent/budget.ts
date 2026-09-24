// Aylık OpenAI token bütçesi. Kullanım KV'de `usage:<YYYY-MM>` anahtarında
// toplanır (sohbet ajanı + prompt oluşturucu). Bütçe dolarsa ajan yerine v1
// anahtar kelime yolu çalışır.

import { kv } from '../kv';

export interface UsageStore {
  get(key: string): Promise<number>;
  add(key: string, tokens: number): Promise<void>;
}

export function kvUsageStore(): UsageStore {
  return {
    async get(key) {
      return Number((await kv.get<number>(key)) ?? 0);
    },
    async add(key, tokens) {
      await kv.incrby(key, tokens);
      // Ay bitince anahtar kendiliğinden düşsün (raporlama için ~2 ay tutulur).
      await kv.expire(key, 62 * 24 * 60 * 60);
    },
  };
}

export function usageKey(now: number = Date.now()): string {
  return `usage:${new Date(now).toISOString().slice(0, 7)}`;
}

/** OPENAI_MONTHLY_TOKEN_BUDGET; tanımsız ya da geçersizse null (sınır yok). */
export function monthlyTokenBudget(): number | null {
  const raw = process.env.OPENAI_MONTHLY_TOKEN_BUDGET?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Bütçe aşıldı mı? Bütçe tanımlı değilse false. Kullanım okunamazsa true
 * (maliyet açısından güvenli taraf: v1 yoluna düşülür).
 */
export async function isOverBudget(store: UsageStore, now: number = Date.now(), budget = monthlyTokenBudget()): Promise<boolean> {
  if (budget === null) return false;
  try {
    return (await store.get(usageKey(now))) >= budget;
  } catch {
    return true;
  }
}

export async function recordUsage(store: UsageStore, tokens: number, now: number = Date.now()): Promise<void> {
  if (tokens <= 0) return;
  try {
    await store.add(usageKey(now), tokens);
  } catch (error) {
    console.warn('[budget] kullanım yazılamadı:', error instanceof Error ? error.message : String(error));
  }
}
