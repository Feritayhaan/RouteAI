// searchCatalog — bir görev için puanlı ve sıralı ürün listesi.
//
// Sıra: sadece status 'active' → kanıtı olmayanlar elenir → sert filtreler →
// boş kalırsa kısıt gevşetilir ve relaxedConstraint ile BİLDİRİLİR (sessiz
// gevşetme yok) → sıralama anahtarı q + fit düzeltmesi.
// Eşitlikte: ownN büyük > dataDate yeni > ücretsiz katmanı olan > ad.
// Sponsorluk ya da affiliate bilgisi sıralamaya ASLA girmez: anahtar sadece
// yukarıdaki alanlardan hesaplanır (search.test.ts kilitler).

import { hasFreeTier } from '../pricing';
import { loadCatalog } from './index';
import { fit, type ConstraintKey, type Constraints, type FitReason } from './fit';
import { scoreProduct, type ScoreContext, type ScoreResult } from './score';
import type { Product, Task } from './schema';

export interface SearchItem {
  product: Product;
  score: ScoreResult;
  fitReasons: FitReason[];
  sortKey: number;
}

export interface SearchResult {
  taskId: string;
  items: SearchItem[];
  /** Görevde kanıtı olan hiçbir aktif ürün yok: "bu alanda güvenilir veri yok". */
  noEvidence: boolean;
  filteredOut: { reason: ConstraintKey | 'no_evidence'; count: number }[];
  /** Sonuç boş kaldığı için gevşetilen kısıtlar (sırayla). Yoksa alan yok. */
  relaxedConstraint?: ConstraintKey[];
}

export interface SearchInput {
  taskId: string;
  constraints?: Constraints;
  limit?: number;
}

export interface SearchContext extends ScoreContext {
  tasksById: Map<string, Task>;
  products: Product[];
}

/** Gevşetme sırası: en az önemli kısıt önce. */
const RELAX_ORDER: ConstraintKey[] = ['maxMonthlyUsd', 'access', 'pricing', 'commercialUse'];

export function defaultSearchContext(now: number = Date.now()): SearchContext {
  const c = loadCatalog();
  return { tasksById: c.tasksById, products: c.products, models: c.models, reviews: c.reviews, signals: c.signals, now };
}

function compare(a: SearchItem, b: SearchItem): number {
  if (b.sortKey !== a.sortKey) return b.sortKey - a.sortKey;
  if (b.score.ownN !== a.score.ownN) return b.score.ownN - a.score.ownN;
  const da = a.score.dataDate ?? '';
  const db = b.score.dataDate ?? '';
  if (da !== db) return db.localeCompare(da);
  const fa = hasFreeTier(a.product.pricing) ? 1 : 0;
  const fb = hasFreeTier(b.product.pricing) ? 1 : 0;
  if (fa !== fb) return fb - fa;
  return a.product.name.localeCompare(b.product.name);
}

export function searchCatalog(input: SearchInput, ctx: SearchContext = defaultSearchContext()): SearchResult {
  const { taskId, limit = 5 } = input;
  const constraints: Constraints = { ...(input.constraints ?? {}) };
  const task = ctx.tasksById.get(taskId);
  if (!task) throw new Error(`searchCatalog: bilinmeyen görev "${taskId}"`);

  const candidates = ctx.products.filter((p) => p.status === 'active' && p.tasks.includes(taskId));
  const scored = candidates.map((product) => ({ product, score: scoreProduct(product, task, ctx) }));
  const withEvidence = scored.filter((s) => s.score.hasEvidence);

  const filteredOut: SearchResult['filteredOut'] = [];
  const noEvidenceCount = scored.length - withEvidence.length;
  if (noEvidenceCount > 0) filteredOut.push({ reason: 'no_evidence', count: noEvidenceCount });

  const apply = (c: Constraints) => {
    const kept: SearchItem[] = [];
    const counts = new Map<ConstraintKey, number>();
    for (const { product, score } of withEvidence) {
      const f = fit(product, task, c, ctx.reviews);
      if (!f.ok) {
        counts.set(f.failed!, (counts.get(f.failed!) ?? 0) + 1);
        continue;
      }
      kept.push({ product, score, fitReasons: f.reasons, sortKey: score.q + f.adjustment });
    }
    return { kept, counts };
  };

  const first = apply(constraints);
  let kept = first.kept;
  for (const [reason, count] of first.counts) filteredOut.push({ reason, count });

  const relaxed: ConstraintKey[] = [];
  if (kept.length === 0 && withEvidence.length > 0) {
    for (const key of RELAX_ORDER) {
      if (constraints[key] === undefined) continue;
      delete constraints[key];
      relaxed.push(key);
      ({ kept } = apply(constraints));
      if (kept.length > 0) break;
    }
  }

  kept.sort(compare);
  return {
    taskId,
    items: kept.slice(0, limit),
    noEvidence: withEvidence.length === 0,
    filteredOut,
    ...(relaxed.length > 0 ? { relaxedConstraint: relaxed } : {}),
  };
}
