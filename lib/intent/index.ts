import { parseUserIntent, type ParseOptions } from './parser';
import { getCachedIntent, setCachedIntent } from './cache';
import { ParsedIntent, IntentParsingError } from './types';

export async function analyzeIntent(
  query: string,
  options: ParseOptions = {}
): Promise<ParsedIntent | IntentParsingError> {
  const cached = await getCachedIntent(query);
  if (cached) {
    return cached;
  }

  const result = await parseUserIntent(query, options);

  // LLM'siz kipte üretilen niyet önbelleğe yazılmaz: sonraki normal
  // isteklerin LLM sonucunu gölgelemesin.
  if ('primaryCategory' in result && result.confidence >= 0.5 && options.allowLLM !== false) {
    const isFallback = result.reasoning.toLowerCase().includes('fallback');
    if (!isFallback) {
      await setCachedIntent(query, result);
    }
  }

  return result;
}

export * from './types';
