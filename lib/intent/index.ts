import { parseUserIntent } from './parser';
import { getCachedIntent, setCachedIntent } from './cache';
import { ParsedIntent, IntentParsingError } from './types';

export async function analyzeIntent(
  query: string
): Promise<ParsedIntent | IntentParsingError> {
  const cached = await getCachedIntent(query);
  if (cached) {
    return cached;
  }

  const result = await parseUserIntent(query);

  if ('primaryCategory' in result && result.confidence >= 0.5) {
    const isFallback = result.reasoning.toLowerCase().includes('fallback');
    if (!isFallback) {
      await setCachedIntent(query, result);
    }
  }

  return result;
}

export * from './types';
