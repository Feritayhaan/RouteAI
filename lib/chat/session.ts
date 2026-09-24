// Anonim oturum kimliği: hesap yok, sadece tarayıcıda (localStorage).

import { localStore, type KeyValueStore } from './storage';

const KEY = 'routeai:sid';

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getSessionId(store: KeyValueStore = localStore()): string {
  const existing = store.get(KEY);
  if (existing && /^[A-Za-z0-9_-]{8,100}$/.test(existing)) return existing;
  const id = randomId();
  store.set(KEY, id);
  return id;
}
