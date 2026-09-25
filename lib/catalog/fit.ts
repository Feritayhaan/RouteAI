// Kullanıcı kısıtlarına uygunluk: sert filtreler + yumuşak sıralama düzeltmesi.
//
// Sert filtre ürünü eler (search.ts eleneni sayar ve gerekirse kısıtı
// gevşetip BİLDİRİR). Bilinmeyen veri ürünü elemez: geçirir ama gerekçeye
// "bilinmiyor" kodunu yazar — kart bunu kullanıcıya gösterir.
// Yumuşak düzeltme q'yu değiştirmez, sadece sıralama anahtarını oynatır.

import { getPricingModel, hasFreeTier } from '../pricing';
import type { ExpertReview, Product, Task } from './schema';
import { BEGINNER_EASE_MAX_ADJUSTMENT } from './weights';

export type AccessChannel = Product['access'][number];

export interface Constraints {
  /** 'free' = tamamen ücretsiz; 'freeTier' = ücretsiz katmanı olan (freemium dahil); 'any' = fark etmez. */
  pricing?: 'free' | 'freeTier' | 'any';
  /** Aylık bütçe üst sınırı (USD). Ücretsiz katmanı olan ürün her bütçeye uyar. */
  maxMonthlyUsd?: number;
  /** Kullanıcının istediği platformlardan en az biri. */
  access?: AccessChannel[];
  /** Ticari kullanım gerekiyor mu? */
  commercialUse?: boolean;
  skill?: 'beginner' | 'advanced';
}

export type ConstraintKey = 'pricing' | 'maxMonthlyUsd' | 'access' | 'commercialUse';

export type FitReason =
  | { code: 'commercial_use_unknown'; params: Record<string, never> }
  | { code: 'commercial_paid_only'; params: Record<string, never> }
  | { code: 'access_unknown'; params: Record<string, never> }
  | { code: 'price_unknown'; params: Record<string, never> }
  | { code: 'easy_for_beginners'; params: { ease: number } };

export interface FitResult {
  ok: boolean;
  /** Elendiyse hangi kısıt yüzünden. */
  failed?: ConstraintKey;
  /** Sıralama anahtarına eklenir; q'ya değil. */
  adjustment: number;
  reasons: FitReason[];
}

export function fit(
  product: Product,
  task: Task,
  constraints: Constraints,
  reviews: ExpertReview[] = []
): FitResult {
  const reasons: FitReason[] = [];
  const fail = (failed: ConstraintKey): FitResult => ({ ok: false, failed, adjustment: 0, reasons });
  const model = getPricingModel(product.pricing);

  // --- Sert filtreler
  if (constraints.pricing === 'free' && model !== 'free') return fail('pricing');
  if (constraints.pricing === 'freeTier' && !hasFreeTier(product.pricing)) return fail('pricing');

  if (constraints.maxMonthlyUsd !== undefined && !hasFreeTier(product.pricing)) {
    const price = product.pricing.startingPrice;
    if (price === null) reasons.push({ code: 'price_unknown', params: {} });
    else if (price > constraints.maxMonthlyUsd) return fail('maxMonthlyUsd');
  }

  if (constraints.access && constraints.access.length > 0) {
    if (product.access.length === 0) reasons.push({ code: 'access_unknown', params: {} });
    else if (!constraints.access.some((a) => product.access.includes(a))) return fail('access');
  }

  if (constraints.commercialUse) {
    const cu = product.facts?.commercialUse;
    if (cu === 'no') return fail('commercialUse');
    if (cu === 'paid-only') {
      // Ücretsiz isteyen ve ticari kullanım gereken kullanıcıya uymaz.
      if (constraints.pricing === 'free') return fail('commercialUse');
      reasons.push({ code: 'commercial_paid_only', params: {} });
    }
    if (cu === undefined) reasons.push({ code: 'commercial_use_unknown', params: {} });
  }

  // --- Yumuşak düzeltme: yeni başlayana kolay ürün (uzman rubriğindeki ease)
  let adjustment = 0;
  if (constraints.skill === 'beginner') {
    const own = reviews.filter((r) => r.productId === product.id && r.taskId === task.id);
    if (own.length > 0) {
      const ease = own.reduce((a, r) => a + r.rubric.ease, 0) / own.length;
      // ease 1..5 -> -0.05..+0.05 (3 nötr)
      adjustment = ((ease - 3) / 2) * BEGINNER_EASE_MAX_ADJUSTMENT;
      if (ease >= 4) reasons.push({ code: 'easy_for_beginners', params: { ease: Math.round(ease * 10) / 10 } });
    }
  }

  return { ok: true, adjustment, reasons };
}
