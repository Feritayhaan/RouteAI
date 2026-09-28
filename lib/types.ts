import { PricingLike } from './pricing'
import type { CurrentModel } from './catalog/currentModel'

export interface RecommendationTool {
  toolName: string
  description: string
  url?: string
  /** Gevsek sema: KV'de migration oncesi kayitlar hala olabilir. Okurken
   *  lib/pricing.ts helper'larini kullan, bayraklari elle yorumlama. */
  pricing?: PricingLike
  strength?: number
  why?: string
  promptSuggestion?: string
  /** Katalogdaki ürün id'si ve gece senkronundan hesaplanan güncel model (varsa). */
  productId?: string
  currentModel?: CurrentModel | null
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
}

export interface WorkflowRecommendation {
  type: 'workflow'
  category: string
  workflow: WorkflowData
}

export type ApiResponse = SimpleRecommendation | WorkflowRecommendation
