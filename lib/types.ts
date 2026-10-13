import { PricingLike } from './pricing'
import type { CurrentModel } from './catalog/currentModel'
import type { BenchmarkSource, Product } from './catalog/schema'
import type { Dictionary } from './i18n/types'
import { format, proofText } from './i18n/index'
import type { RecommendationItem as V3Item, RecommendV3Result } from './recommendV3'

export type Confidence = 'high' | 'medium' | 'low'

/** Skor/fit gerekçesi: metin değil kod (lib/i18n reasonText metne çevirir). */
export interface ReasonCode {
  code: string
  params?: Record<string, unknown>
}

export interface RecommendationTool {
  toolName: string
  description: string
  url?: string
  /** Gevsek sema: KV'de migration oncesi kayitlar hala olabilir. Okurken
   *  lib/pricing.ts helper'larini kullan, bayraklari elle yorumlama. */
  pricing?: PricingLike
  /** Ürünün fiyat sayfası: fiyat doğrulanmamışsa kart buraya yönlendirir. */
  pricingUrl?: string
  strength?: number
  why?: string
  promptSuggestion?: string
  /** Katalogdaki ürün id'si ve gece senkronundan hesaplanan güncel model (varsa). */
  productId?: string
  currentModel?: CurrentModel | null
  /** v3 (RouteAI Skoru) alanları; v1'de yok. */
  confidence?: Confidence
  reasons?: ReasonCode[]
  /** Kullanılan kanıtın en yenisi (YYYY-MM-DD). */
  dataDate?: string | null
  /** Puana giren benchmark kaynakları (kaynak adı kartta görünür: lisans şartı). */
  sources?: BenchmarkSource[]
  /** 'editor': kanıt yokken RouteAI editör seçimi (puansız); gerekçesi editorNote. */
  basis?: 'evidence' | 'editor'
  editorNote?: string
}

export interface WorkflowStep {
  order: number
  name: string
  description: string
  /** v1 kategorisi; sohbet iş akışında yok. */
  category?: string
  /** Aracın seçildiği katalog görevi (data/tasks.json). */
  taskId?: string
  primary: RecommendationTool
  /** Farklı bir ürün; görevde başka aday yoksa null. Sohbet iş akışında yok. */
  alternative?: RecommendationTool | null
  tips?: string[]
}

export interface WorkflowData {
  name: string
  totalSteps: number
  categories: string[]
  steps: WorkflowStep[]
}

export interface SimpleRecommendation {
  type?: 'simple'
  category: string
  main: RecommendationTool
  alternatives: RecommendationTool[]
  /** Sorgudaki fiyat koşulu ("ücretsiz"/"ücretli") tutmadı ve gevşetildi: kullanıcıya söylenir. */
  relaxedPricing?: 'free' | 'freemium' | 'paid' | null
  /** v3: bulunan görev ve adı (kartta v1 kategorisinin yerine). */
  taskId?: string
  taskLabel?: string
  /** v3: sorgudaki kısıt gevşetildi (lib/catalog/fit.ts anahtarları). */
  relaxedConstraint?: string[]
  /** v3 editör seçimi varken görevdeki diğer araçlar (puansız, "doğrulanmadı"). */
  unverified?: RecommendationTool[]
  /** v3: sorgunun istediği boyutlar (kullanıcı dilinde): ölçülen ve katalogda henüz ölçülemeyen. */
  queryNeeds?: { measured: string[]; unmeasured: string[] }
  /** v3: "Neden alternatifleri yerine bu seçildi?" — kazanan vs her alternatif, sadece ölçülmüş farklar. */
  whyChosen?: { altName: string; winner: string[]; alt: string[] }[]
}

export interface WorkflowRecommendation {
  type: 'workflow'
  category: string
  workflow: WorkflowData
}

/** v3: görev belirsiz — "Şunu mu demek istedin?" + görev düğmeleri. */
export interface ClarifyRecommendation {
  type: 'clarify'
  options: { taskId: string; label: string }[]
}

/** v3: görev bulundu ama kanıtlı ürün yok — dürüst boş durum, araçlar "doğrulanmadı". */
export interface NoEvidenceRecommendation {
  type: 'no_evidence'
  taskId: string
  taskLabel: string
  /** Alfabetik; sıralama iddiası yok. */
  products: RecommendationTool[]
}

export type ApiResponse = SimpleRecommendation | WorkflowRecommendation | ClarifyRecommendation | NoEvidenceRecommendation

// ------------------------------------------------------------------
// v3 (/api/recommend, RECOMMENDER=v3) cevabını ana sayfanın tiplerine çevirir.
// ------------------------------------------------------------------

type Locale = 'en' | 'tr'

function productTool(p: Product, locale: Locale): RecommendationTool {
  return { toolName: p.name, description: p.description[locale], url: p.url, pricing: p.pricing, productId: p.id, ...(p.pricingUrl ? { pricingUrl: p.pricingUrl } : {}) }
}

function itemTool(i: V3Item, locale: Locale): RecommendationTool {
  return {
    ...productTool(i.product, locale),
    confidence: i.confidence,
    reasons: i.reasons,
    dataDate: i.dataDate,
    sources: i.sources,
    basis: i.basis,
    ...(i.editorNote ? { editorNote: i.editorNote[locale] } : {}),
    ...(i.currentModel ? { currentModel: i.currentModel } : {}),
  }
}

type V3Rec = Extract<RecommendV3Result, { kind: 'recommendation' }>

/** Sorgu boyutları ve karşılaştırmalı kanıt: kod -> kullanıcı dilinde metin (lib/i18n). */
function evidenceTexts(result: V3Rec, dict: Dictionary): Pick<SimpleRecommendation, 'queryNeeds' | 'whyChosen'> {
  const out: Pick<SimpleRecommendation, 'queryNeeds' | 'whyChosen'> = {}
  const dims = dict.fit.dims as Record<string, string>
  if (result.queryNeeds?.length) {
    out.queryNeeds = {
      measured: result.queryNeeds.filter((n) => n.measured).map((n) => dims[n.dimension] ?? n.dimension),
      unmeasured: result.queryNeeds.filter((n) => !n.measured).map((n) => dims[n.dimension] ?? n.dimension),
    }
  }
  const names = new Map(result.items.map((i) => [i.product.id, i.product.name]))
  if (result.comparisons?.length) {
    out.whyChosen = result.comparisons.map((c) => {
      const winnerName = names.get(c.winnerId) ?? c.winnerId
      const altName = names.get(c.altId) ?? c.altId
      return {
        altName,
        winner: c.winnerEdges.map((e) => proofText(dict, e, altName)).filter((t): t is string => t !== null),
        alt: c.altEdges.map((e) => proofText(dict, e, winnerName)).filter((t): t is string => t !== null),
      }
    })
  }
  return out
}

/** "{winner} ile {alt}" başlığı için yardımcı (Evidence.tsx). */
export function versusTitle(dict: Dictionary, winner: string, alt: string): string {
  return format(dict.fit.vs, { winner, alt })
}

/**
 * null: öneri var ama arayüz fiyat filtresi bütün ürünleri eledi (filtre
 * asla gevşetilmez) — çağıran bunu kullanıcıya ayrıca söyler.
 */
export function apiResponseFromV3(result: RecommendV3Result, dict: Dictionary, locale: Locale = 'tr'): ApiResponse | null {
  switch (result.kind) {
    case 'recommendation': {
      const [main, ...alternatives] = result.items
      if (!main) return null
      return {
        type: 'simple',
        category: result.taskId,
        taskId: result.taskId,
        taskLabel: result.taskLabel[locale],
        main: itemTool(main, locale),
        alternatives: alternatives.map((i) => itemTool(i, locale)),
        ...(result.relaxedConstraint?.length ? { relaxedConstraint: result.relaxedConstraint } : {}),
        ...(result.unverified?.length ? { unverified: result.unverified.map((p) => productTool(p, locale)) } : {}),
        ...evidenceTexts(result, dict),
      }
    }
    case 'clarify': {
      const seen = new Set<string>()
      return {
        type: 'clarify',
        options: result.options
          .filter((o) => !seen.has(o.taskId) && seen.add(o.taskId))
          .map((o) => ({ taskId: o.taskId, label: o.label[locale] })),
      }
    }
    case 'no_evidence':
      return {
        type: 'no_evidence',
        taskId: result.taskId,
        taskLabel: result.taskLabel[locale],
        products: result.products.map((p) => productTool(p, locale)),
      }
    case 'workflow':
      return {
        type: 'workflow',
        category: result.templateId,
        workflow: {
          name: result.templateName,
          totalSteps: result.steps.length,
          categories: [],
          steps: result.steps.map((s) => {
            const [primary, alternative] = s.items
            const base = { order: s.order, name: s.name, description: s.description, taskId: s.taskIds[0], ...(s.tips ? { tips: s.tips } : {}) }
            if (primary) {
              return { ...base, primary: itemTool(primary, locale), alternative: alternative ? itemTool(alternative, locale) : null }
            }
            // Kanıtlı araç yok: araç adı yerine durum yazılır (sohbet iş akışı
            // kartıyla aynı kalıp); görevdeki araçlar sadece "doğrulanmadı" diye listelenir.
            const unverified = (s.products ?? []).map((p) => p.name)
            return {
              ...base,
              primary: {
                toolName: s.noEvidence ? dict.workflow.noProduct : dict.v3.stepFiltered,
                description: s.noEvidence && unverified.length > 0 ? dict.v3.unverifiedList.replace('{tools}', unverified.join(', ')) : '',
              },
              alternative: null,
            }
          }),
        },
      }
  }
}
