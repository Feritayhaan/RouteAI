// Sorgu-araç uyumu (7 evrensel boyut) ve karşılaştırmalı kanıt. Deterministik, LLM yok.
//
// Aynı görevdeki her sorguya aynı sırayı döndürmemek için sorgunun istediği
// boyutlar okunur ve her boyut KATALOGDAKİ GERÇEK bir veriyle ölçülür:
//   language      — ürün gerçeği facts.languages (kaynaklı); yoksa ölçülmedi
//   longContext   — LMArena "document" arenası (uzun doküman / dosya soru-cevap)
//   reasoning     — Artificial Analysis Intelligence Index, yoksa LMArena "text"
//   liveWeb       — LMArena "search" arenası (web aramalı yanıt)
//   outputControl — sorguya göre arena: kod/IDE -> "webdev", düzenleme ->
//                   "image_edit" / "video_edit"; arenası olmayan kontrol
//                   (görselde yazı, kamera) ölçülmedi olarak bildirilir
//   budget        — ürünün fiyat modeli (products.json, priceCheckedAt'li)
//   signals       — RouteAI iş sonucu/oy sinyali (signals.json); q'nun içinde
//                   zaten Bayesçi olarak var, burada sadece kanıt olarak gösterilir
// Verisi olmayan boyut uydurulmaz: "ölçülmedi" (measured: false) döner ve
// sıralamayı etkilemez. Ayarlama q'yu değiştirmez, sıralama anahtarını oynatır;
// kendi gözlemimiz arttıkça küçülür (weights.ts: K_QUERY_FIT).

import { getPricingModel, hasFreeTier } from '../pricing';
import { arenaBenchmark, type BenchmarkComponent, type ScoreResult } from './score';
import type { BenchmarkSource, Model, Product, Signal, Task } from './schema';
import { K_QUERY_FIT, QUERY_FIT_MAX_ADJUSTMENT } from './weights';

export const FIT_DIMENSIONS = ['language', 'longContext', 'reasoning', 'liveWeb', 'outputControl', 'budget', 'signals'] as const;
export type FitDimension = (typeof FIT_DIMENSIONS)[number];

export interface ArenaRef {
  source: BenchmarkSource;
  key: string;
}

export interface QueryNeeds {
  /** Sorgunun açıkça istediği boyutlar (signals her zaman var). */
  dimensions: FitDimension[];
  /** language: istenen dil kodu (ör. "tr"). */
  language?: string;
  /** outputControl: ölçüldüğü arena; arenası olmayan kontrol için yok. */
  outputArena?: ArenaRef;
  /** budget: "free" tamamen ücretsiz, "freeTier" ücretsiz katman yeter. */
  budget?: 'free' | 'freeTier';
}

const START = '(?<![\\p{L}\\p{N}])';
/** Kelime başına ve sonuna bağlı; Türkçe ekler için kalıpta açıkça \p{L}* yazılır. */
const cue = (body: string) => new RegExp(`${START}(?:${body})(?![\\p{L}])`, 'iu');
const TR = '\\p{L}*';

const CUES = {
  turkish: cue(`türkçe${TR}|turkish|türk dili${TR}`),
  multilingual: cue(`çok dilli|multilingual|birden fazla dil${TR}|many languages|several languages|her dilde`),
  longContext: cue(`uzun (?:doküman|belge|metin|rapor|pdf)${TR}|long (?:documents?|reports?|pdfs?|context|texts?)|yüzlerce sayfa${TR}|hundreds of pages|\\d{2,}\\s*(?:sayfa${TR}|pages)|kitab${TR}|kitap${TR}|books?|thesis|sözleşme${TR}|contracts?|kod taban${TR}|codebase|büyük (?:dosya|veri)${TR}|large (?:files?|documents?|datasets?)|tüm (?:doküman|belge)${TR}|entire (?:document|book|repo)`),
  reasoning: cue(`karmaşık${TR}|complex|derin${TR}|in-depth|akıl yürüt${TR}|reasoning|mantık${TR}|logic(?:al)?|matemati${TR}|math(?:s|ematics)?|strateji${TR}|strateg(?:y|ic)|hukuk${TR}|legal|bilimsel|scientific|zor (?:problem|soru)${TR}|hard problems?|adım adım|step by step|kanıtla${TR}|prove`),
  liveWeb: cue(`güncel${TR}|current|latest|son dakika|haber${TR}|news|bugün${TR}|today|bu hafta${TR}|this week|kaynakça${TR}|kaynaklı|kaynaklarıyla|citations?|cite|referans${TR}|internet${TR}|web'?de|web search|search the web|canlı veri${TR}|live data|real[- ]time|gerçek zamanlı`),
  code: cue(`ide|vs ?code|editör${TR}|kod taban${TR}|codebase|repo${TR}|pull requests?|terminal${TR}|cli|frontend|backend|react|next\\.?js|typescript|python|web sitesi${TR}|websites?|web uygulama${TR}|web apps?`),
  edit: cue(`düzenle${TR}|edit(?:ing|s)?|rötuş${TR}|retouch(?:ing)?|arka ?plan${TR} (?:sil|kaldır|değiştir)${TR}|remove (?:the )?background|inpaint${TR}|nesne sil${TR}|remove objects?`),
  uncontrolled: cue(`yazı${TR}|metin${TR}|text|tipografi${TR}|typography|kamera${TR}|camera|pan|zoom|dolly|kontrol${TR}|control`),
  free: cue(`ücretsiz${TR}|bedava${TR}|free|parasız|no cost`),
  fullyFree: cue(`tamamen ücretsiz${TR}|completely free|totally free|hiç para${TR}`),
  budget: cue(`bütçe${TR}|budget|ucuz${TR}|cheap(?:er)?|uygun fiyat${TR}|affordable|düşük maliyet${TR}|low cost`),
};

const TEXT_LIKE = new Set(['text', 'research', 'code', 'data', 'slides', 'automation']);

/** Sorgunun istediği boyutlar. Görevin türüne uymayan boyut eklenmez (ör. görselde uzun doküman). */
export function detectNeeds(query: string, task: Pick<Task, 'modality' | 'id'>): QueryNeeds {
  const dims: FitDimension[] = [];
  const needs: QueryNeeds = { dimensions: dims };
  if (CUES.turkish.test(query)) {
    dims.push('language');
    needs.language = 'tr';
  } else if (CUES.multilingual.test(query)) {
    dims.push('language');
  }
  const textLike = TEXT_LIKE.has(task.modality);
  if (textLike && CUES.longContext.test(query)) dims.push('longContext');
  if (textLike && CUES.reasoning.test(query)) dims.push('reasoning');
  if (textLike && CUES.liveWeb.test(query)) dims.push('liveWeb');

  if ((task.modality === 'code' || task.id.startsWith('code.')) && CUES.code.test(query)) {
    dims.push('outputControl');
    needs.outputArena = { source: 'lmarena', key: 'webdev' };
  } else if (task.modality === 'image' && CUES.edit.test(query)) {
    dims.push('outputControl');
    needs.outputArena = { source: 'lmarena', key: 'image_edit' };
  } else if (task.modality === 'video' && CUES.edit.test(query)) {
    dims.push('outputControl');
    needs.outputArena = { source: 'lmarena', key: 'video_edit' };
  } else if ((task.modality === 'image' || task.modality === 'video') && CUES.uncontrolled.test(query)) {
    dims.push('outputControl'); // ölçülecek arena yok: "ölçülmedi" olarak bildirilir
  }

  if (CUES.fullyFree.test(query)) {
    dims.push('budget');
    needs.budget = 'free';
  } else if (CUES.free.test(query) || CUES.budget.test(query)) {
    dims.push('budget');
    needs.budget = 'freeTier';
  }
  dims.push('signals');
  return needs;
}

/** Bir boyutun bir üründeki ölçümü. value 0..1 (yüksek = sorguya daha uygun); measured false ise yok. */
export interface DimensionMeasure {
  dimension: FitDimension;
  measured: boolean;
  value?: number;
  /** Arena ölçümüyse: kaynak, arena, sıra (lisans: kaynak adı gösterilir). */
  arena?: Pick<BenchmarkComponent, 'source' | 'arena' | 'rank' | 'total' | 'modelName' | 'fetchedAt'>;
  /** budget: fiyat modeli; signals: başarı yüzdesi ve gözlem sayısı. */
  pricingModel?: 'free' | 'freemium' | 'paid';
  pct?: number;
  n?: number;
  /** language: ürünün desteklediği diller içinde istenen var mı. */
  supports?: boolean;
}

export interface ProductFit {
  measures: DimensionMeasure[];
  /** Sıralama anahtarına eklenecek düzeltme (q değişmez). */
  adjustment: number;
}

interface FitContext {
  models: Model[];
  signals: Signal[];
}

function arenaMeasure(dimension: FitDimension, product: Product, ref: ArenaRef, models: Model[]): DimensionMeasure | null {
  const b = arenaBenchmark(product, ref.source, ref.key, models);
  if (!b) return null;
  return {
    dimension,
    measured: true,
    value: b.percentile,
    arena: { source: b.source, arena: b.arena, rank: b.rank, total: b.total, modelName: b.modelName, fetchedAt: b.fetchedAt },
  };
}

export function measure(dimension: FitDimension, product: Product, task: Pick<Task, 'id'>, needs: QueryNeeds, ctx: FitContext): DimensionMeasure {
  const none: DimensionMeasure = { dimension, measured: false };
  switch (dimension) {
    case 'language': {
      const langs = product.facts?.languages;
      if (!langs) return none;
      if (!needs.language) return { dimension, measured: true, value: Math.min(1, langs.length / 5), supports: langs.length > 1 };
      const supports = langs.includes(needs.language);
      return { dimension, measured: true, value: supports ? 1 : 0, supports };
    }
    case 'longContext':
      return arenaMeasure(dimension, product, { source: 'lmarena', key: 'document' }, ctx.models) ?? none;
    case 'reasoning':
      return arenaMeasure(dimension, product, { source: 'artificialanalysis', key: 'llm_intelligence' }, ctx.models)
        ?? arenaMeasure(dimension, product, { source: 'lmarena', key: 'text' }, ctx.models)
        ?? none;
    case 'liveWeb':
      return arenaMeasure(dimension, product, { source: 'lmarena', key: 'search' }, ctx.models) ?? none;
    case 'outputControl':
      return needs.outputArena ? arenaMeasure(dimension, product, needs.outputArena, ctx.models) ?? none : none;
    case 'budget': {
      const model = getPricingModel(product.pricing);
      const value = needs.budget === 'free' ? (model === 'free' ? 1 : 0) : hasFreeTier(product.pricing) ? 1 : 0;
      return { dimension, measured: true, value, pricingModel: model };
    }
    case 'signals': {
      const s = ctx.signals.find((x) => x.productId === product.id && x.taskId === task.id);
      const n = s ? s.outcomes.yes + s.outcomes.partial + s.outcomes.no : 0;
      if (!s || n === 0) return none;
      const pct = Math.round((100 * (s.outcomes.yes + 0.5 * s.outcomes.partial)) / n);
      return { dimension, measured: true, value: pct / 100, pct, n };
    }
  }
}

/**
 * Ürünün sorguya uyumu. Ayarlama: istenen boyutlarda (signals hariç: q'nun
 * içinde zaten var) ölçülen değerlerin 0.5'ten sapma ortalaması; ölçülmeyen
 * boyut 0 (nötr) sayılır. Kendi gözlem ağırlığı (ownN) arttıkça küçülür.
 */
export function productFit(product: Product, task: Pick<Task, 'id'>, needs: QueryNeeds, ctx: FitContext, score?: Pick<ScoreResult, 'ownN'>): ProductFit {
  const measures = needs.dimensions.map((d) => measure(d, product, task, needs, ctx));
  const ranked = measures.filter((m) => m.dimension !== 'signals');
  if (ranked.length === 0) return { measures, adjustment: 0 };
  const deviation = ranked.reduce((a, m) => a + (m.measured && m.value !== undefined ? m.value - 0.5 : 0), 0) / ranked.length;
  const shrink = K_QUERY_FIT / (K_QUERY_FIT + (score?.ownN ?? 0));
  return { measures, adjustment: Math.round(2 * deviation * QUERY_FIT_MAX_ADJUSTMENT * shrink * 10000) / 10000 };
}

// ------------------------------------------------------------------
// Karşılaştırmalı kanıt: kazanan vs alternatif (sadece ölçülmüş farklar)
// ------------------------------------------------------------------

/** Metin değil kod: arayüz lib/i18n ile metne çevirir. Her parametre katalog verisinden. */
export type ProofEdge =
  | { code: 'arena_ahead'; params: { dimension: FitDimension; source: BenchmarkSource; arena: string; rank: number; otherRank: number; total: number } }
  | { code: 'arena_only'; params: { dimension: FitDimension; source: BenchmarkSource; arena: string; rank: number; total: number } }
  | { code: 'task_arena_ahead'; params: { source: BenchmarkSource; arena: string; rank: number; otherRank: number; total: number } }
  | { code: 'free_tier'; params: Record<string, never> }
  | { code: 'fully_free'; params: Record<string, never> }
  | { code: 'language'; params: { language: string } }
  | { code: 'outcome_better'; params: { pct: number; n: number; otherPct: number; otherN: number } };

export interface HeadToHead {
  winnerId: string;
  altId: string;
  /** Kazananın bu sorgudaki ölçülmüş üstünlükleri. */
  winnerEdges: ProofEdge[];
  /** Alternatifin farklı odağı/kısıtı: onun öne çıktığı ölçülmüş noktalar. */
  altEdges: ProofEdge[];
}

export interface Contender {
  product: Product;
  score: Pick<ScoreResult, 'components'>;
  fit: ProductFit;
}

function edgesOf(a: Contender, b: Contender): ProofEdge[] {
  const edges: ProofEdge[] = [];
  // 1. Sorgunun istediği boyutlar
  for (const ma of a.fit.measures) {
    const mb = b.fit.measures.find((m) => m.dimension === ma.dimension);
    if (!ma.measured || ma.dimension === 'signals') continue;
    if (ma.arena) {
      if (mb?.measured && mb.arena && ma.arena.arena === mb.arena.arena && ma.arena.source === mb.arena.source) {
        if (ma.arena.rank < mb.arena.rank) {
          edges.push({ code: 'arena_ahead', params: { dimension: ma.dimension, source: ma.arena.source, arena: ma.arena.arena, rank: ma.arena.rank, otherRank: mb.arena.rank, total: ma.arena.total } });
        }
      } else if (!mb?.measured) {
        edges.push({ code: 'arena_only', params: { dimension: ma.dimension, source: ma.arena.source, arena: ma.arena.arena, rank: ma.arena.rank, total: ma.arena.total } });
      }
    } else if (ma.dimension === 'budget' && mb?.measured && (ma.value ?? 0) > (mb.value ?? 0)) {
      edges.push(ma.pricingModel === 'free' ? { code: 'fully_free', params: {} } : { code: 'free_tier', params: {} });
    } else if (ma.dimension === 'language' && ma.supports && mb?.measured && !mb.supports) {
      edges.push({ code: 'language', params: { language: 'tr' } });
    }
  }
  // 2. Görevin kendi arenaları (RouteAI Skoru'ndaki benchmark bileşeni)
  for (const ba of a.score.components.benchmarks) {
    const bb = b.score.components.benchmarks.find((x) => x.source === ba.source && x.arena === ba.arena);
    if (bb && ba.rank < bb.rank && !edges.some((e) => 'arena' in e.params && e.params.arena === ba.arena && e.params.source === ba.source)) {
      edges.push({ code: 'task_arena_ahead', params: { source: ba.source, arena: ba.arena, rank: ba.rank, otherRank: bb.rank, total: ba.total } });
    }
  }
  // 3. Kendi kanıtımız: iş sonucu
  const oa = a.score.components.outcomes;
  const ob = b.score.components.outcomes;
  const na = oa.yes + oa.partial + oa.no;
  const nb = ob.yes + ob.partial + ob.no;
  if (na > 0 && nb > 0) {
    const pa = Math.round((100 * (oa.yes + 0.5 * oa.partial)) / na);
    const pb = Math.round((100 * (ob.yes + 0.5 * ob.partial)) / nb);
    if (pa > pb) edges.push({ code: 'outcome_better', params: { pct: pa, n: na, otherPct: pb, otherN: nb } });
  }
  // 4. Bütçe istenmese de fiyat modeli farkı (ücretsiz katman) gerçek ve kullanıcıya önemli
  if (!a.fit.measures.some((m) => m.dimension === 'budget') && hasFreeTier(a.product.pricing) && !hasFreeTier(b.product.pricing)) {
    edges.push({ code: 'free_tier', params: {} });
  }
  return edges;
}

/** Kazanan ile her alternatif (en fazla `limit`) arasında ölçülmüş üstünlükler. Uydurma yok: veri yoksa kenar yok. */
export function headToHead(winner: Contender, alternatives: Contender[], limit = 2): HeadToHead[] {
  return alternatives.slice(0, limit).map((alt) => ({
    winnerId: winner.product.id,
    altId: alt.product.id,
    winnerEdges: edgesOf(winner, alt),
    altEdges: edgesOf(alt, winner),
  }));
}
