import { kv } from '../kv';
import { ParsedIntent } from './types';

// v2: eski parser pricing:'free' degerini VARSAYILAN olarak her intent'e yaziyordu;
// yeni kod o kisiti uyguladigi icin cache'teki eski kayitlar "ucretsiz" demeyen
// sorgulari da ucretsiz havuzuna sikistiriyordu. Prefix cevrildi, eski anahtarlar
// 24 saatlik TTL ile kendiliginden olecek.
const CACHE_PREFIX = 'intent:v2:';
const CACHE_TTL = 60 * 60 * 24;

export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/[^\w\s]/g, '') // noktalama kaldır
    .replace(/\s+/g, ' ')
    .trim();
}

function getCacheKey(query: string): string {
  const normalized = normalizeQuery(query);
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
