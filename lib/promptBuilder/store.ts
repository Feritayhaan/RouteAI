// Prompt oturumu deposu: KV (`ps:<id>`, 24 saat TTL) ya da bellek (test/eval).

import { kv } from '../kv';
import { SESSION_TTL_SECONDS, type PromptSession } from './types';

export interface PromptSessionStore {
  get(id: string): Promise<PromptSession | null>;
  set(session: PromptSession): Promise<void>;
}

const key = (id: string) => `ps:${id}`;

/**
 * Kullanıcının ham mesajları (session.userMessages) oturumla birlikte saklansın mı?
 * Şimdilik HAYIR: mesajlar sadece o istekteki üretimde kullanılır, kayıttan önce
 * atılır (soru kartı cevabında ve iyileştirmede üretici yine `goal` ile çalışır).
 * Depolama sistemi hazır olunca true yapılır; o gün gizlilik metni
 * (lib/i18n/privacy.ts) ve docs/privacy-verification.md de güncellenmeli.
 */
export const PERSIST_USER_MESSAGES = false;

/** Depoya yazılacak hali: PERSIST_USER_MESSAGES kapalıysa userMessages atılır. */
export function toStored(session: PromptSession, persistUserMessages = PERSIST_USER_MESSAGES): PromptSession {
  if (persistUserMessages || !session.userMessages) return session;
  const stored = { ...session };
  delete stored.userMessages;
  return stored;
}

export function kvPromptStore(): PromptSessionStore {
  return {
    async get(id) {
      return (await kv.get<PromptSession>(key(id))) ?? null;
    },
    async set(session) {
      await kv.set(key(session.id), toStored(session), { ex: SESSION_TTL_SECONDS });
    },
  };
}

/** Süre dolumu `now` ile taklit edilebilir (test). */
export function memoryPromptStore(now: () => number = Date.now): PromptSessionStore & { expire(id: string): void } {
  const map = new Map<string, { session: PromptSession; expiresAt: number }>();
  return {
    async get(id) {
      const hit = map.get(id);
      if (!hit || hit.expiresAt <= now()) return null;
      return structuredClone(hit.session);
    },
    async set(session) {
      map.set(session.id, { session: structuredClone(toStored(session)), expiresAt: now() + SESSION_TTL_SECONDS * 1000 });
    },
    expire(id) {
      map.delete(id);
    },
  };
}

export function newPromptSessionId(): string {
  try {
    return `p_${crypto.randomUUID().replace(/-/g, '')}`;
  } catch {
    return `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}
