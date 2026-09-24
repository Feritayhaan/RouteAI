// Ajan çalışamadığında (OpenAI hatası, zaman aşımı, bütçe dolu) v1 anahtar
// kelime yolu. LLM çağrılmaz (allowLLM: false). Sonuç, puansız bir
// 'fallback' öneri kartıdır; kullanıcıya kısa bir not gösterilir.

import { recommendV1 } from '../recommendV1';
import type { Tool } from '../toolsService';
import type { RecommendationCard, RecommendationItem } from './cards';

export const FALLBACK_NOTE = {
  en: 'The assistant is unavailable right now, so here is a quick keyword-based suggestion.',
  tr: 'Asistan şu an kullanılamıyor; anahtar kelimeye dayalı hızlı bir öneri gösteriyorum.',
} as const;

export const FALLBACK_EMPTY = {
  en: 'The assistant is unavailable right now and I could not match your request. Please try again in a moment.',
  tr: 'Asistan şu an kullanılamıyor ve isteğini eşleştiremedim. Birazdan tekrar dener misin?',
} as const;

function item(tool: Tool): RecommendationItem {
  return {
    productId: tool.id ?? tool.name,
    name: tool.name,
    url: tool.url,
    q: null,
    confidence: null,
    ownN: null,
    benchmarkShare: null,
    shares: null,
    reasons: [],
    pricing: { ...tool.pricing },
    dataDate: tool.pricing?.priceCheckedAt ?? null,
    sources: [],
  };
}

export async function fallbackRecommendation(query: string): Promise<RecommendationCard | null> {
  const result = await recommendV1(query, 'all', { allowLLM: false });
  if (result.kind !== 'simple') return null;
  const { main, alternatives } = result.selection;
  return {
    type: 'recommendation',
    mode: 'fallback',
    taskId: null,
    noEvidence: false,
    items: [main, ...alternatives.slice(0, 2)].map(item),
  };
}
