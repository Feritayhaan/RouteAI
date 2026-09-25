// Skor motoru testleri için küçük, elle kurulmuş katalog parçaları.
// Gerçek veri DEĞİL; sayılar senaryoyu kurmak için.
import { makePricing, type PricingModel } from '../pricing';
import type { ExpertReview, Model, Product, Signal, Task } from '../catalog/schema';
import type { SearchContext } from '../catalog/search';

export const NOW = Date.parse('2026-09-24T12:00:00Z');
export const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString().slice(0, 10);

export function task(id = 'image.generate', benchmark: Task['benchmark'] = [{ source: 'lmarena', key: 'text_to_image' }]): Task {
  return {
    id, label: { en: id, tr: id }, description: { en: id, tr: id }, modality: 'image',
    benchmark, slots: [], outputTypes: ['image'],
  };
}

export function product(id: string, opts: { models?: string[]; tasks?: string[]; pricing?: PricingModel; price?: number | null; checkedAt?: string | null; access?: Product['access']; facts?: Product['facts'] } = {}): Product {
  return {
    id, name: id.toUpperCase(), url: `https://example.com/${id}`,
    description: { en: id, tr: id },
    tasks: opts.tasks ?? ['image.generate'], models: opts.models ?? [],
    pricing: makePricing(opts.pricing ?? 'freemium', 'price' in opts ? opts.price ?? null : 10, opts.checkedAt === undefined ? daysAgo(5) : opts.checkedAt),
    access: opts.access ?? [], status: 'active', reviewStatus: 'reviewed', addedAt: '2025-01-01',
    ...(opts.facts ? { facts: opts.facts } : {}),
  };
}

/** Bir arenada verilen değerlerle modeller: m0..mN. */
export function arenaModels(values: number[], key = 'text_to_image', fetchedAt = daysAgo(3)): Model[] {
  return values.map((value, i) => ({
    id: `m${i}`, name: `M${i}`, creator: 'lab', aliases: [], modalities: ['image'],
    scores: [{ source: 'lmarena', key, value, fetchedAt }],
  }));
}

export function signal(productId: string, s: Partial<Pick<Signal, 'outcomes' | 'comparisons' | 'votes'>> & { lastAt?: string }, taskId = 'image.generate'): Signal {
  return {
    productId, taskId,
    outcomes: { yes: 0, partial: 0, no: 0, ...s.outcomes },
    comparisons: { wins: 0, losses: 0, ...s.comparisons },
    votes: { up: 0, down: 0, ...s.votes },
    lastAt: s.lastAt ?? daysAgo(1),
  };
}

export function review(productId: string, rubric: ExpertReview['rubric'], taskId = 'image.generate', date = daysAgo(2)): ExpertReview {
  return { productId, taskId, briefId: 'b1', rubric, notes: {}, reviewer: 'test', date };
}

export function ctx(parts: { products: Product[]; tasks?: Task[]; models?: Model[]; reviews?: ExpertReview[]; signals?: Signal[] }): SearchContext {
  const tasks = parts.tasks ?? [task()];
  return {
    tasksById: new Map(tasks.map((t) => [t.id, t])),
    products: parts.products,
    models: parts.models ?? [],
    reviews: parts.reviews ?? [],
    signals: parts.signals ?? [],
    now: NOW,
  };
}
