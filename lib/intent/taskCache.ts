// Görev sınıflandırma önbelleği — lib/intent/cache.ts ile aynı desen.
//
// Anahtar önek: task:v1:. Kullanıcı metni loglanmaz (sadece uzunluğu);
// anahtarın kendisi normalize edilmiş sorguyu içerir (intent/cache.ts'teki
// gibi) — KV'ye YAZILAN şey budur, konsola değil.

import { kv } from '../kv';
import type { TaskClassification, TaskClarify } from './taskClassifier';

const CACHE_PREFIX = 'task:v1:';
const CACHE_TTL = 60 * 60 * 24; // 24 saat

/** intent/cache.ts'teki normalizeQuery ile aynı: diakritiksiz, noktalamasız. */
export function normalizeTaskQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getTaskCacheKey(query: string): string {
  return `${CACHE_PREFIX}${normalizeTaskQuery(query)}`;
}

export async function getCachedTask(query: string): Promise<TaskClassification | TaskClarify | null> {
  try {
    const cached = await kv.get<TaskClassification | TaskClarify>(getTaskCacheKey(query));
    if (cached) console.log('[Task Cache] HIT, sorgu uzunluğu:', query.length);
    return cached ?? null;
  } catch (error) {
    console.warn('[Task Cache] Get error:', error);
    return null;
  }
}

export async function setCachedTask(query: string, result: TaskClassification | TaskClarify): Promise<void> {
  try {
    await kv.set(getTaskCacheKey(query), result, { ex: CACHE_TTL });
    console.log('[Task Cache] SET, sorgu uzunluğu:', query.length);
  } catch (error) {
    console.warn('[Task Cache] Set error:', error);
  }
}
