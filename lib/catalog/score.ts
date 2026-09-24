// RouteAI Skoru — (ürün, görev) çifti için deterministik puan.
//
// Formül ve eşikler docs/ROADMAP-v2.md'de, sabitler lib/catalog/weights.ts'te.
// İlke: sıralama RouteAI'ın kendi kanıtına dayanır (iş sonucu, karşılaştırma,
// oy, uzman değerlendirmesi); benchmark sadece ön bilgidir ve kendi kanıtımız
// biriktikçe payı düşer. Tarih her zaman ctx.now'dan okunur (Date.now yok).

import { PRICE_STALE_AFTER_DAYS, hasFreeTier } from '../pricing';
import type { BenchmarkSource, ExpertReview, Model, Product, Signal, Task } from './schema';
import {
  FRESH_DAYS,
  HIGH_OWN_N,
  K_BENCHMARK,
  K_EXPERT,
  MEDIUM_OWN_N,
  MIN_OWN_N_AS_EVIDENCE,
  OUTCOME_Y,
  W_COMPARISON,
  W_OUTCOME,
  W_VOTE,
  rubricToE,
} from './weights';

export type Confidence = 'high' | 'medium' | 'low';

/** Metin değil kod: arayüz lib/i18n'deki şablonla metne çevirir. */
export type Reason =
  | { code: 'outcome_success'; params: { pct: number; n: number } }
  | { code: 'comparison_wins'; params: { wins: number; losses: number } }
  | { code: 'expert_rubric'; params: { quality: number; ease: number; value: number; speed: number } }
  | { code: 'benchmark_rank'; params: { source: BenchmarkSource; arena: string; rank: number; total: number } }
  | { code: 'users_like'; params: { pct: number; n: number } }
  | { code: 'free_tier'; params: Record<string, never> }
  | { code: 'price_stale'; params: { days: number } }
  | { code: 'benchmark_only'; params: Record<string, never> };

export interface ScoreContext {
  models: Model[];
  reviews: ExpertReview[];
  signals: Signal[];
  /** Epoch ms. */
  now: number;
}

export interface BenchmarkComponent {
  source: BenchmarkSource;
  arena: string;
  modelId: string;
  /** En iyi modelin arenadaki yüzdelik dilimi (0–1). */
  percentile: number;
  rank: number;
  total: number;
  fetchedAt: string;
}

export interface ScoreResult {
  q: number;
  confidence: Confidence;
  hasEvidence: boolean;
  /** Kendi gözlemlerin ağırlık toplamı (iş sonucu + karşılaştırma + oy). */
  ownN: number;
  /** Benchmark'ın paydadaki payı (0–1); kartta gösterilir. */
  benchmarkShare: number;
  components: {
    B?: number;
    E?: number;
    benchmarks: BenchmarkComponent[];
    outcomes: Signal['outcomes'];
    comparisons: Signal['comparisons'];
    votes: Signal['votes'];
  };
  reasons: Reason[];
  /** Kullanılan verilerin en yenisi / en eskisi (YYYY-MM-DD). Veri yoksa null. */
  dataDate: string | null;
  oldestDataDate: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_SIGNAL = {
  outcomes: { yes: 0, partial: 0, no: 0 },
  comparisons: { wins: 0, losses: 0 },
  votes: { up: 0, down: 0 },
};

export function ageDays(date: string, now: number): number {
  return Math.floor((now - Date.parse(date)) / DAY_MS);
}

const round = (x: number, digits = 3) => Math.round(x * 10 ** digits) / 10 ** digits;
const day = (d: string) => d.slice(0, 10);

/**
 * Bir arenada ürünün en iyi modelinin yüzdelik dilimi.
 * Yüzdelik = (altında kalan model + eşitlerin yarısı) / (toplam - 1).
 * Arenada tek model varsa karşılaştırma yapılamaz: null.
 */
function arenaBenchmark(product: Product, source: BenchmarkSource, key: string, models: Model[]): BenchmarkComponent | null {
  const arena = models
    .map((m) => ({ m, s: m.scores.find((x) => x.source === source && x.key === key) }))
    .filter((x): x is { m: Model; s: NonNullable<typeof x.s> } => x.s !== undefined);
  if (arena.length < 2) return null;

  const own = arena.filter((x) => product.models.includes(x.m.id));
  if (own.length === 0) return null;
  const best = own.reduce((a, b) => (b.s.value > a.s.value ? b : a));

  const below = arena.filter((x) => x.s.value < best.s.value).length;
  const equal = arena.filter((x) => x.s.value === best.s.value).length - 1;
  const above = arena.filter((x) => x.s.value > best.s.value).length;
  return {
    source,
    arena: key,
    modelId: best.m.id,
    percentile: (below + equal / 2) / (arena.length - 1),
    rank: above + 1,
    total: arena.length,
    fetchedAt: best.s.fetchedAt,
  };
}

export function scoreProduct(product: Product, task: Task, ctx: ScoreContext): ScoreResult {
  const dates: string[] = [];
  const reasons: Reason[] = [];

  // --- B: benchmark (yoksa k_b = 0)
  const benchmarks = task.benchmark
    .map((b) => arenaBenchmark(product, b.source, b.key, ctx.models))
    .filter((b): b is BenchmarkComponent => b !== null);
  const B = benchmarks.length > 0 ? benchmarks.reduce((a, b) => a + b.percentile, 0) / benchmarks.length : undefined;
  const kb = B === undefined ? 0 : K_BENCHMARK;
  for (const b of benchmarks) dates.push(day(b.fetchedAt));

  // --- E: uzman rubriği (yoksa k_e = 0)
  const reviews = ctx.reviews.filter((r) => r.productId === product.id && r.taskId === task.id);
  const E = reviews.length > 0 ? reviews.reduce((a, r) => a + rubricToE(r.rubric), 0) / reviews.length : undefined;
  const ke = E === undefined ? 0 : K_EXPERT;
  for (const r of reviews) dates.push(day(r.date));

  // --- Kendi gözlemler
  const signal = ctx.signals.find((s) => s.productId === product.id && s.taskId === task.id);
  const { outcomes, comparisons, votes } = signal ?? EMPTY_SIGNAL;
  const nOutcomes = outcomes.yes + outcomes.partial + outcomes.no;
  const nComparisons = comparisons.wins + comparisons.losses;
  const nVotes = votes.up + votes.down;
  const ownN = W_OUTCOME * nOutcomes + W_COMPARISON * nComparisons + W_VOTE * nVotes;
  const ownWy =
    W_OUTCOME * (outcomes.yes * OUTCOME_Y.yes + outcomes.partial * OUTCOME_Y.partial + outcomes.no * OUTCOME_Y.no) +
    W_COMPARISON * comparisons.wins +
    W_VOTE * votes.up;
  const lastAt = signal && ownN > 0 ? day(signal.lastAt) : null;
  if (lastAt) dates.push(lastAt);

  // --- q
  const denominator = kb + ke + ownN;
  const q = denominator > 0 ? (kb * (B ?? 0) + ke * (E ?? 0) + ownWy) / denominator : 0;
  const benchmarkShare = denominator > 0 ? kb / denominator : 0;
  const hasEvidence = B !== undefined || E !== undefined || ownN >= MIN_OWN_N_AS_EVIDENCE;

  // --- Güven
  const ownFresh = lastAt !== null && ageDays(lastAt, ctx.now) <= FRESH_DAYS;
  const benchmarkFresh = benchmarks.length > 0 && benchmarks.every((b) => ageDays(b.fetchedAt, ctx.now) <= FRESH_DAYS);
  const confidence: Confidence =
    ownN >= HIGH_OWN_N && ownFresh ? 'high'
      : ownN >= MEDIUM_OWN_N || (benchmarkFresh && E !== undefined) ? 'medium'
        : 'low';

  // --- Gerekçeler (kod + parametre)
  if (nOutcomes > 0) {
    reasons.push({ code: 'outcome_success', params: { pct: Math.round((100 * (outcomes.yes + 0.5 * outcomes.partial)) / nOutcomes), n: nOutcomes } });
  }
  if (nComparisons > 0) reasons.push({ code: 'comparison_wins', params: { ...comparisons } });
  if (reviews.length > 0) {
    const avg = (k: keyof ExpertReview['rubric']) => round(reviews.reduce((a, r) => a + r.rubric[k], 0) / reviews.length, 1);
    reasons.push({ code: 'expert_rubric', params: { quality: avg('quality'), ease: avg('ease'), value: avg('value'), speed: avg('speed') } });
  }
  for (const b of benchmarks) {
    reasons.push({ code: 'benchmark_rank', params: { source: b.source, arena: b.arena, rank: b.rank, total: b.total } });
  }
  if (nVotes > 0) reasons.push({ code: 'users_like', params: { pct: Math.round((100 * votes.up) / nVotes), n: nVotes } });
  if (hasFreeTier(product.pricing)) reasons.push({ code: 'free_tier', params: {} });
  const checkedAt = product.pricing.priceCheckedAt;
  if (checkedAt && ageDays(checkedAt, ctx.now) > PRICE_STALE_AFTER_DAYS) {
    reasons.push({ code: 'price_stale', params: { days: ageDays(checkedAt, ctx.now) } });
  }
  if (B !== undefined && E === undefined && ownN === 0) reasons.push({ code: 'benchmark_only', params: {} });

  const sorted = [...dates].sort();
  return {
    q: round(q, 4),
    confidence,
    hasEvidence,
    ownN: round(ownN, 2),
    benchmarkShare: round(benchmarkShare, 4),
    components: {
      ...(B !== undefined ? { B: round(B, 4) } : {}),
      ...(E !== undefined ? { E: round(E, 4) } : {}),
      benchmarks,
      outcomes: { ...outcomes },
      comparisons: { ...comparisons },
      votes: { ...votes },
    },
    reasons,
    dataDate: sorted.at(-1) ?? null,
    oldestDataDate: sorted[0] ?? null,
  };
}
