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
  /** v1 kategorisi; sohbet iş akışında yok (rozet gösterilmez). */
  category?: string
  primary: RecommendationTool
  /** Sohbet iş akışında alternatif yok. */
  alternative?: RecommendationTool
  tips?: string[]
}

export interface WorkflowData {
  name: string
  totalSteps: number
  estimatedDuration: string
  complexity: string
  categories: string[]
  steps: WorkflowStep[]
}

export interface SimpleRecommendation {
  type?: 'simple'
  category: string
  main: RecommendationTool
  alternatives: RecommendationTool[]
}

export interface WorkflowRecommendation {
  type: 'workflow'
  category: string
  workflow: WorkflowData
}

export type ApiResponse = SimpleRecommendation | WorkflowRecommendation
