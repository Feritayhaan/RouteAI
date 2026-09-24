// Basit sözlük tabanlı i18n (kütüphane yok). Dil seçimi: ./locale.ts

import type { BenchmarkSource } from '../catalog/schema';
import { findArena } from '../catalog/benchmarkKeys';
import { SOURCES } from '../catalog/sources';
import { getPricingModel, type PricingLike } from '../pricing';
import { en } from './en';
import { tr } from './tr';
import type { Dictionary } from './types';

export { LOCALES, DEFAULT_LOCALE, LOCALE_HEADER, isLocale, resolveLocale, type Locale } from './locale';
import type { Locale } from './locale';

export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { en, tr };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** "{name}" yer tutucularını doldurur; bilinmeyen yer tutucu olduğu gibi kalır. */
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in params ? String(params[key]) : m));
}

type ReasonLike = { code: string; params?: Record<string, unknown> };

/** Skor/fit gerekçe kodunu sözlükteki şablonla metne çevirir. Bilinmeyen kod: null. */
export function reasonText(dict: Dictionary, reason: ReasonLike): string | null {
  const template = (dict.reasons as Record<string, string>)[reason.code];
  if (!template) return null;
  const p = { ...(reason.params ?? {}) } as Record<string, string | number>;
  if (reason.code === 'benchmark_rank') {
    const source = String(p.source) as BenchmarkSource;
    p.arena = findArena(source, String(p.arena))?.label ?? String(p.arena);
    p.source = SOURCES[source]?.label ?? String(p.source);
  }
  if (reason.code === 'comparison_wins') p.total = Number(p.wins) + Number(p.losses);
  return format(template, p);
}

/** lib/pricing formatPrice ile aynı kural, dile göre. */
export function priceText(dict: Dictionary, pricing: PricingLike | null | undefined): string {
  if (getPricingModel(pricing) === 'free') return dict.price.free;
  const price = pricing?.startingPrice;
  if (price === null || price === undefined || price === 0) return dict.price.unknown;
  return format(dict.price.perMonth, { price });
}
