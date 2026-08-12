import { PricingLike } from './pricing'

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
}

export interface WorkflowStep {
  order: number
  name: string
  description: string
  category: string
  primary: RecommendationTool
  alternative: RecommendationTool
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
