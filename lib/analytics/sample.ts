// ÖRNEK VERİ — stats ucunu yerelde denemek için (/api/admin/stats?sample=1,
// sadece NODE_ENV !== 'production'). Tamamen sentetik: gerçek kullanıcı,
// ürün sonucu ya da puan DEĞİL. Sayılar deterministik (rastgele yok).

import { recordEvent } from './store';
import { memoryAnalyticsStore } from './memory';
import type { EventName } from './events';

const DAY = 24 * 60 * 60 * 1000;

export async function sampleStatsSource(now: number) {
  const store = memoryAnalyticsStore();
  const emit = (name: EventName, day: number, session: number, extra: Record<string, unknown> = {}) =>
    recordEvent({ name, sessionId: `sample_session_${session}`, ...extra }, now - day * DAY, store);

  for (let day = 0; day < 20; day++) {
    for (let s = 0; s < 10; s++) {
      const session = day * 10 + s;
      await emit('chat_start', day, session);
      if (s % 4 === 0) await emit('clarify_shown', day, session);
      await emit('recommendation_shown', day, session, { taskId: s % 2 ? 'image.logo' : 'slides.create' });
      if (s % 2 === 0) await emit('tool_click', day, session, { taskId: 'slides.create' });
      if (s % 3 === 0) {
        await emit('prompt_generated', day, session, { guideId: 'gamma', guideVersion: 1 });
        if (s % 6 === 0) await emit('prompt_copied', day, session, { guideId: 'gamma', guideVersion: 1, variant: 'safe' });
        await emit('prompt_refined', day, session, { guideId: 'gamma', guideVersion: 1, refinementId: 'shorter' });
      }
      if (s < 5) await emit('outcome_shown', day, session, { taskId: 'slides.create' });
      if (s < 2) await emit('outcome_answered', day, session, { taskId: 'slides.create' });
      // Aynı oturum 3 gün sonra geri dönüyor (her 5 oturumdan biri)
      if (s % 5 === 0 && day >= 3) await emit('chat_start', day - 3, session);
    }
    store.set(`usage:day:${new Date(now - day * DAY).toISOString().slice(0, 10)}`, 1000 + day * 10);
  }
  for (let i = 0; i < 12; i++) {
    const key = `sig:outcome:sample${i}:slides.create:gamma-ai`;
    store.set(key, { taskId: 'slides.create', productId: 'gamma-ai', answer: i % 4 === 0 ? 'no' : i % 4 === 1 ? 'partial' : 'yes', tags: [], promptSessionId: null, guideId: 'gamma', guideVersion: 1, at: new Date(now - i * DAY).toISOString() });
    store.sadd('sig:outcome:index', key);
  }
  for (let i = 0; i < 10; i++) {
    const key = `sig:vote:sample${i}:slides.create:gamma-ai`;
    store.set(key, { taskId: 'slides.create', productId: 'gamma-ai', toolName: 'Gamma AI', vote: i < 8 ? 'up' : 'down', ts: now, sessionHash: `h${i}`, at: new Date(now - i * DAY).toISOString() });
    store.sadd('sig:vote:index', key);
  }
  return store;
}
