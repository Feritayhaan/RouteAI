"use client"

import { useState, useEffect, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, MessageCircle, Rocket, ExternalLink, Star, ChevronDown, ChevronUp, Workflow, ArrowRight, Copy, Check } from "lucide-react"
import WelcomeModal from "@/components/WelcomeModal"
import ThemeToggle from "@/components/ThemeToggle"

// ============================================
// Type Definitions
// ============================================

interface RecommendationTool {
  toolName: string
  description: string
  url?: string
  pricing?: {
    free?: boolean
    freemium?: boolean
    paidOnly?: boolean
    startingPrice?: number
    currency?: string
  }
  strength?: number
  why?: string
  promptSuggestion?: string
}

interface WorkflowStep {
  order: number
  name: string
  description: string
  category: string
  primary: RecommendationTool
  alternative: RecommendationTool
  tips?: string[]
}

interface WorkflowData {
  name: string
  totalSteps: number
  estimatedDuration: string
  complexity: string
  categories: string[]
  steps: WorkflowStep[]
}

interface SimpleRecommendation {
  type?: 'simple'
  category: string
  main: RecommendationTool
  alternatives: RecommendationTool[]
}

interface WorkflowRecommendation {
  type: 'workflow'
  category: string
  workflow: WorkflowData
}

type ApiResponse = SimpleRecommendation | WorkflowRecommendation

// Window interface for ratings
declare global {
  interface Window {
    analyzeRatings: () => void
  }
}

// ============================================
// Helper Components
// ============================================

function PricingBadges({ pricing }: { pricing?: RecommendationTool['pricing'] }) {
  if (!pricing) return null
  const tags: string[] = []

  if (pricing.free) tags.push("Free")
  if (pricing.freemium) tags.push("Freemium")
  if (pricing.paidOnly) tags.push("Paid")

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 dark:bg-muted/30 text-[10px] font-semibold text-muted-foreground"
        >
          {tag}
        </span>
      ))}
      {pricing.startingPrice !== undefined && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
          ${pricing.startingPrice}/ay
        </span>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
      title="Prompt'u kopyala"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const categoryLabels: Record<string, string> = {
    gorsel: '🎨 Görsel',
    metin: '✍️ Metin',
    ses: '🎵 Ses',
    video: '🎬 Video',
    arastirma: '🔍 Araştırma',
    veri: '📊 Veri',
    kod: '💻 Kod',
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase">
      {categoryLabels[category] || category}
    </span>
  )
}

// ============================================
// Workflow Step Component
// ============================================

function WorkflowStepCard({ step, isExpanded, onToggle }: {
  step: WorkflowStep
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50 hover:border-primary/30 transition-all">
      {/* Step Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {step.order}
          </div>
          <div>
            <h4 className="font-semibold text-sm">{step.name}</h4>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CategoryBadge category={step.category} />
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
          {/* Primary Tool */}
          <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-3 border border-primary/20">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary uppercase">🏆 Önerilen</span>
                  <PricingBadges pricing={step.primary.pricing} />
                </div>
                <h5 className="font-bold text-base">{step.primary.toolName}</h5>
                <p className="text-xs text-muted-foreground">{step.primary.description}</p>
                {step.primary.why && (
                  <p className="text-xs text-primary/80 mt-1">
                    💡 {step.primary.why}
                  </p>
                )}
              </div>
              <a
                href={step.primary.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Git
              </a>
            </div>

            {/* Prompt Suggestion */}
            {step.primary.promptSuggestion && (
              <div className="mt-3 bg-muted/50 rounded-lg p-2.5 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Örnek Prompt</span>
                  <CopyButton text={step.primary.promptSuggestion} />
                </div>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {step.primary.promptSuggestion}
                </p>
              </div>
            )}
          </div>

          {/* Alternative Tool */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">🔄 Alternatif</span>
                  <PricingBadges pricing={step.alternative.pricing} />
                </div>
                <h5 className="font-semibold text-sm">{step.alternative.toolName}</h5>
                <p className="text-xs text-muted-foreground">{step.alternative.description}</p>
              </div>
              <a
                href={step.alternative.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">💡 İpuçları</span>
              <ul className="mt-1 space-y-0.5">
                {step.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Workflow Display Component
// ============================================

function WorkflowDisplay({ workflow }: { workflow: WorkflowData }) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]))

  const toggleStep = (order: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(order)) {
        next.delete(order)
      } else {
        next.add(order)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedSteps(new Set(workflow.steps.map(s => s.order)))
  }

  const collapseAll = () => {
    setExpandedSteps(new Set())
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="relative group">
        {/* Gradient Border */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 rounded-3xl blur-lg opacity-40 dark:opacity-30 group-hover:opacity-60 transition-opacity duration-500" />

        {/* Card Content */}
        <div className="relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl p-5 md:p-6 space-y-5 shadow-2xl">
          {/* Workflow Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Workflow</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {workflow.totalSteps} Adım
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    ⏱️ {workflow.estimatedDuration}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    {workflow.name}
                  </span>
                </h2>
                <div className="flex flex-wrap gap-1 mt-2">
                  {workflow.categories.map(cat => (
                    <CategoryBadge key={cat} category={cat} />
                  ))}
                </div>
              </div>
            </div>

            {/* Expand/Collapse Controls */}
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="text-[10px] px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
              >
                Tümünü Aç
              </button>
              <button
                onClick={collapseAll}
                className="text-[10px] px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
              >
                Tümünü Kapat
              </button>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-3">
            {workflow.steps.map((step, index) => (
              <div key={step.order} className="relative">
                <WorkflowStepCard
                  step={step}
                  isExpanded={expandedSteps.has(step.order)}
                  onToggle={() => toggleStep(step.order)}
                />
                {index < workflow.steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className="w-4 h-4 text-primary/50 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cost Calculator */}
          <div className="bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💰</span>
              <h3 className="text-sm font-bold">Tahmini Maliyet</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Budget Option */}
              <div className="bg-card/50 rounded-lg p-3 border border-border/30 hover:border-emerald-500/30 transition-colors">
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                  📦 Bütçe
                </div>
                <div className="text-lg font-black text-foreground">
                  $0
                  <span className="text-xs font-normal text-muted-foreground">/ay</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sadece ücretsiz araçlar
                </p>
              </div>

              {/* Recommended Option */}
              <div className="bg-primary/5 rounded-lg p-3 border-2 border-primary/30 relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full uppercase">
                  Önerilen
                </div>
                <div className="text-[10px] font-bold text-primary uppercase mb-1">
                  ⭐ Standart
                </div>
                <div className="text-lg font-black text-foreground">
                  ${Math.round(workflow.steps.reduce((acc, step) => {
                    const price = step.primary.pricing?.startingPrice || 0;
                    return acc + (step.primary.pricing?.free ? 0 : Math.min(price, 20));
                  }, 0))}
                  <span className="text-xs font-normal text-muted-foreground">/ay</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  En iyi değer/performans
                </p>
              </div>

              {/* Pro Option */}
              <div className="bg-card/50 rounded-lg p-3 border border-border/30 hover:border-blue-500/30 transition-colors">
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">
                  🚀 Profesyonel
                </div>
                <div className="text-lg font-black text-foreground">
                  ${Math.round(workflow.steps.reduce((acc, step) => {
                    const price = step.primary.pricing?.startingPrice || 20;
                    return acc + price;
                  }, 0))}
                  <span className="text-xs font-normal text-muted-foreground">/ay</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Tüm pro özellikler
                </p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              * Tahmini aylık maliyet. Gerçek fiyatlar değişebilir.
            </p>
          </div>

          {/* Workflow Summary */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              ✨ Bu workflow {workflow.totalSteps} adımda {workflow.categories.length} farklı AI kategorisi kullanıyor
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Simple Recommendation Display (Original)
// ============================================

function SimpleRecommendationDisplay({
  recommendation,
  rating,
  onRatingChange,
  ratingFeedback
}: {
  recommendation: SimpleRecommendation
  rating: number
  onRatingChange: (rating: number) => void
  ratingFeedback: boolean
}) {
  const renderPricingBadges = () => {
    if (!recommendation.main.pricing) return null
    return <PricingBadges pricing={recommendation.main.pricing} />
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 rounded-3xl blur-lg opacity-40 dark:opacity-30 group-hover:opacity-60 transition-opacity duration-500" />

        <div className="relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl p-4 md:p-6 lg:p-10 space-y-4 md:space-y-6 shadow-2xl">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2 md:gap-4 pb-3 md:pb-4 border-b border-border/50">
            <div className="flex items-start gap-2 md:gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Rocket className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>

              <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={recommendation.category} />
                </div>
                {renderPricingBadges()}

                <h2 className="text-xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight break-words">
                  <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    {recommendation.main.toolName}
                  </span>
                </h2>

                {/* Rating */}
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => onRatingChange(star)}
                        className="transition-all duration-200 hover:scale-110"
                      >
                        <Star
                          className={`w-4 h-4 md:w-5 md:h-5 transition-colors cursor-pointer ${star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600 hover:fill-yellow-400/50'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] md:text-xs text-muted-foreground">
                    {rating > 0 ? `${rating} yıldız` : 'Değerlendir'}
                  </span>
                  {ratingFeedback && (
                    <span className="text-[10px] md:text-xs text-primary animate-in fade-in">
                      Teşekkür ederiz! 💫
                    </span>
                  )}
                </div>
              </div>
            </div>

            <a
              href={recommendation.main.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all shadow-lg text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Araca Git</span>
            </a>
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                Ana öneri
              </div>
              <p className="text-sm md:text-base lg:text-lg leading-relaxed text-card-foreground">
                {recommendation.main.description}
              </p>
              {recommendation.main.why && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-2">
                    <span className="text-primary text-xs font-semibold">💡</span>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {recommendation.main.why}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {recommendation.alternatives && recommendation.alternatives.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                  Alternatif araçlar
                </div>
                <div className="flex flex-col gap-2">
                  {recommendation.alternatives.map((alt) => (
                    <a
                      key={alt.toolName}
                      href={alt.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm flex justify-between items-center hover:underline"
                    >
                      <span>{alt.toolName}</span>
                      {alt.pricing?.startingPrice && (
                        <span className="text-xs text-muted-foreground">
                          ${alt.pricing.startingPrice}/ay
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export default function Home() {
  const [query, setQuery] = useState("")
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [ratingFeedback, setRatingFeedback] = useState(false)

  const getRecommendation = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setResponse(null)
    setRating(0)

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: query }),
      })

      if (!res.ok) {
        throw new Error("API isteği başarısız oldu")
      }

      const data = await res.json()

      // LOW_CONFIDENCE hatası için özel işlem
      if (data.isLowConfidence && data.error) {
        const suggestionText = data.suggestions
          ? `\n\n${data.suggestions.map((s: string) => `• ${s}`).join('\n')}`
          : '';
        setError(data.error + suggestionText)
        return
      }

      // Diğer hatalar
      if (data.error) {
        throw new Error(data.error)
      }

      setResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu")
      console.error("Hata:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      getRecommendation()
    }
  }

  const saveRatingToLocalStorage = (newRating: number) => {
    if (!response || response.type === 'workflow') return

    try {
      const existingRatings = localStorage.getItem('routeai-ratings')
      const ratings = existingRatings ? JSON.parse(existingRatings) : []

      const existingIndex = ratings.findIndex(
        (r: any) => r.query === query && r.toolName === response.main.toolName
      )

      const ratingData = {
        id: Date.now().toString(),
        query: query,
        toolName: response.main.toolName,
        rating: newRating,
        timestamp: new Date().toISOString()
      }

      if (existingIndex !== -1) {
        ratings[existingIndex] = { ...ratings[existingIndex], rating: newRating, timestamp: new Date().toISOString() }
      } else {
        ratings.push(ratingData)
      }

      localStorage.setItem('routeai-ratings', JSON.stringify(ratings))
      setRatingFeedback(true)
      setTimeout(() => setRatingFeedback(false), 2000)
    } catch (error) {
      console.error('Rating kaydetme hatası:', error)
    }
  }

  useEffect(() => {
    if (!response || response.type === 'workflow') return

    try {
      const existingRatings = localStorage.getItem('routeai-ratings')
      if (existingRatings) {
        const ratings = JSON.parse(existingRatings)
        const previousRating = ratings.find(
          (r: any) => r.query === query && r.toolName === response.main.toolName
        )

        if (previousRating) {
          setRating(previousRating.rating)
        }
      }
    } catch (error) {
      console.error('Rating yükleme hatası:', error)
    }
  }, [response, query])

  const handleStarClick = (star: number) => {
    setRating(star)
    saveRatingToLocalStorage(star)
  }

  // Analytics function
  useEffect(() => {
    window.analyzeRatings = () => {
      try {
        const existingRatings = localStorage.getItem('routeai-ratings')
        if (!existingRatings) {
          console.log('Henüz değerlendirme yok.')
          return
        }

        const ratings = JSON.parse(existingRatings)
        const totalRatings = ratings.length
        const toolStats: Record<string, { total: number, count: number }> = {}
        const queryStats: Record<string, number> = {}

        ratings.forEach((r: any) => {
          if (!toolStats[r.toolName]) {
            toolStats[r.toolName] = { total: 0, count: 0 }
          }
          toolStats[r.toolName].total += r.rating
          toolStats[r.toolName].count += 1
          queryStats[r.query] = (queryStats[r.query] || 0) + 1
        })

        console.log('\n📊 ROUTEAI RATING ANALİZİ')
        console.log('========================')
        console.log(`Toplam Değerlendirme: ${totalRatings}`)

        console.log('\n🏆 ARAÇ PERFORMANSLARI:')
        Object.entries(toolStats).forEach(([tool, stats]) => {
          const average = (stats.total / stats.count).toFixed(1)
          console.log(`• ${tool}: ${average}/5 (${stats.count} değerlendirme)`)
        })

        console.log('\n🔥 EN POPÜLER SORGULAR:')
        Object.entries(queryStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .forEach(([q, count]) => {
            console.log(`• "${q}" (${count} değerlendirme)`)
          })

      } catch (error) {
        console.error('Analiz hatası:', error)
      }
    }
  }, [])

  // Check if response is a workflow
  const isWorkflow = response?.type === 'workflow'

  return (
    <>
      <WelcomeModal />
      <ThemeToggle />
      <main className="min-h-screen bg-background flex items-center justify-center p-3 md:p-6 relative overflow-hidden">
        {/* Gradient Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl opacity-60 dark:opacity-40" />
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-l from-primary/15 to-transparent rounded-full blur-3xl opacity-50 dark:opacity-30" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl opacity-40 dark:opacity-25" />
        </div>

        <div className="w-full max-w-2xl space-y-6 md:space-y-10 relative z-10 px-2 md:px-0">
          {/* Header */}
          <div className="text-center space-y-3 md:space-y-5 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-center mb-2 md:mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-primary/40 blur-2xl opacity-60 dark:opacity-50 rounded-full animate-pulse" />
                <div className="relative z-10">
                  <Sparkles className="w-12 h-12 md:w-20 md:h-20 lg:w-24 lg:h-24 text-primary drop-shadow-2xl animate-pulse"
                    style={{
                      filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6)) drop-shadow(0 0 16px hsl(var(--primary) / 0.4))'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-balance leading-[1.1]">
                <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  RouteAI
                </span>
                <span className="text-foreground/90"> - </span>
                <span className="bg-gradient-to-r from-foreground/90 via-foreground to-foreground/90 bg-clip-text text-transparent">
                  Yapay Zeka Navigatörü
                </span>
              </h1>

              <p className="text-xs md:text-sm lg:text-base font-semibold text-muted-foreground/80 tracking-wide uppercase">
                🚀 Artık Workflow Desteği ile!
              </p>
            </div>

            <p className="text-sm md:text-lg lg:text-xl text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed font-normal mt-3 md:mt-6">
              Ne yapmak istediğini yaz, <strong>tek araç veya adım adım workflow</strong> önerilsin
            </p>
          </div>

          {/* Input Section */}
          <div className="space-y-3 md:space-y-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

              <div className="relative bg-card/80 dark:bg-card border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 focus-within:shadow-2xl focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/30">
                <div className="absolute top-3 left-3 md:top-5 md:left-5 z-10">
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-300" />
                </div>

                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Örnek: Çizgi roman oluşturmak istiyorum, Podcast başlatmak istiyorum, Marka kimliği tasarla..."
                  className="w-full min-h-[100px] md:min-h-[140px] pl-11 md:pl-14 pr-3 md:pr-5 pt-3 md:pt-5 pb-3 md:pb-5 text-base md:text-lg bg-transparent border-0 rounded-2xl resize-none focus:outline-none focus:ring-0 transition-all placeholder:text-muted-foreground/60"
                  style={{ boxShadow: 'none' }}
                />
              </div>
            </div>

            <Button
              onClick={getRecommendation}
              disabled={isLoading || !query.trim()}
              className="w-full h-12 md:h-14 text-base md:text-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Düşünüyorum...
                </span>
              ) : (
                "Bana Yol Göster"
              )}
            </Button>
          </div>

          {/* Error Message */}
          {error && !isLoading && (
            <div className="animate-in fade-in duration-300">
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 md:p-6">
                <p className="text-destructive font-medium text-sm md:text-base whitespace-pre-line text-left">{error}</p>
              </div>
            </div>
          )}

          {/* Response Display */}
          {response && !isLoading && (
            isWorkflow ? (
              <WorkflowDisplay workflow={(response as WorkflowRecommendation).workflow} />
            ) : (
              <SimpleRecommendationDisplay
                recommendation={response as SimpleRecommendation}
                rating={rating}
                onRatingChange={handleStarClick}
                ratingFeedback={ratingFeedback}
              />
            )
          )}
        </div>
      </main>
    </>
  )
}
