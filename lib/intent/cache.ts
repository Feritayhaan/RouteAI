import { kv } from '../kv';
import { ParsedIntent } from './types';

const CACHE_PREFIX = 'intent:';
const CACHE_TTL = 60 * 60 * 24;

function getCacheKey(query: string): string {
  const normalized = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  return `${CACHE_PREFIX}${normalized}`;
}

export async function getCachedIntent(
  query: string
): Promise<ParsedIntent | null> {
  try {
    const key = getCacheKey(query);
    const cached = await kv.get<ParsedIntent>(key);
    
    if (cached) {
      console.log('[Intent Cache] HIT:', query);
    }
    
    return cached;
  } catch (error) {
    console.warn('[Intent Cache] Get error:', error);
    return null;
  }
}

export async function setCachedIntent(
  query: string,
  intent: ParsedIntent
): Promise<void> {
  try {
    const key = getCacheKey(query);
    await kv.set(key, intent, { ex: CACHE_TTL });
    console.log('[Intent Cache] SET:', query);
  } catch (error) {
    console.warn('[Intent Cache] Set error:', error);
  }
}
