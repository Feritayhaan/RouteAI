"use client"

import { useState, useEffect, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, MessageCircle } from "lucide-react"
import WelcomeModal from "@/components/WelcomeModal"
import ThemeToggle from "@/components/ThemeToggle"
import WorkflowDisplay from "@/components/WorkflowDisplay"
import SimpleRecommendationDisplay from "@/components/SimpleRecommendationDisplay"
import type { ApiResponse, SimpleRecommendation, WorkflowRecommendation } from "@/lib/types"

interface ToolRating {
  toolName: string;
  rating: number;
  timestamp?: string;
  id?: string;
  query?: string;
}

// Window interface for ratings
declare global {
  interface Window {
    analyzeRatings: () => void
  }
}

export default function HomeClient() {
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
      const ratings: ToolRating[] = existingRatings ? JSON.parse(existingRatings) as ToolRating[] : []

      const existingIndex = ratings.findIndex(
        (r: ToolRating) => r.query === query && r.toolName === response.main.toolName
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
        const ratings = JSON.parse(existingRatings) as ToolRating[]
        const previousRating = ratings.find(
          (r: ToolRating) => r.query === query && r.toolName === response.main.toolName
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

        const ratings = JSON.parse(existingRatings) as ToolRating[]
        const totalRatings = ratings.length
        const toolStats: Record<string, { total: number, count: number }> = {}
        const queryStats: Record<string, number> = {}

        ratings.forEach((r: ToolRating) => {
          if (!toolStats[r.toolName]) {
            toolStats[r.toolName] = { total: 0, count: 0 }
          }
          toolStats[r.toolName].total += r.rating
          toolStats[r.toolName].count += 1
          if (r.query) {
            queryStats[r.query] = (queryStats[r.query] || 0) + 1
          }
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
