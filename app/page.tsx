"use client"

import { useState, useEffect, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, MessageCircle, Rocket, Clipboard, ChevronDown, ChevronUp, ExternalLink, Star, Lightbulb } from "lucide-react"
import WelcomeModal from "@/components/WelcomeModal"

interface Recommendation {
  toolName: string
  description: string
  reason: string
  suggestedPrompt: string
  url?: string
}

// Tool URL mapping
const toolUrls: Record<string, string> = {
  "ChatGPT (GPT-5.1)": "https://chat.openai.com",
  "Claude 4.5 Sonnet": "https://claude.ai",
  "Gemini 3": "https://gemini.google.com",
  "Midjourney": "https://www.midjourney.com",
  "Ideogram": "https://ideogram.ai",
  "Perplexity": "https://www.perplexity.ai",
  "Consensus": "https://consensus.app",
  "NotebookLM": "https://notebooklm.google.com",
  "Gamma": "https://gamma.app",
  "DeepSeek Coder": "https://www.deepseek.com",
  "Runway Gen-3": "https://runwayml.com",
  "Suno AI": "https://www.suno.ai",
  "ElevenLabs": "https://elevenlabs.io",
  "Canva Magic Studio": "https://www.canva.com"
}

// Window interface'ini genişlet
declare global {
  interface Window {
    analyzeRatings: () => void;
  }
}

export default function Home() {
  const [query, setQuery] = useState("")
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [ratingFeedback, setRatingFeedback] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    reason: true,
    prompt: true
  })

  const getRecommendation = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setRecommendation(null)
    setRating(0)

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: query }),
      })

      if (!response.ok) {
        throw new Error("API isteği başarısız oldu")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setRecommendation(data)
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }


  const getToolUrl = (toolName: string): string => {
    return toolUrls[toolName] || "#"
  }

  // localStorage fonksiyonları
  const saveRatingToLocalStorage = (newRating: number) => {
    if (!recommendation) return

    try {
      const existingRatings = localStorage.getItem('routeai-ratings')
      const ratings = existingRatings ? JSON.parse(existingRatings) : []

      // Aynı query ve toolName için mevcut rating'i bul
      const existingIndex = ratings.findIndex(
        (r: any) => r.query === query && r.toolName === recommendation.toolName
      )

      const ratingData = {
        id: Date.now().toString(),
        query: query,
        toolName: recommendation.toolName,
        rating: newRating,
        timestamp: new Date().toISOString()
      }

      if (existingIndex !== -1) {
        // Mevcut rating'i güncelle
        ratings[existingIndex] = {
          ...ratings[existingIndex],
          rating: newRating,
          timestamp: new Date().toISOString()
        }
      } else {
        // Yeni rating ekle
        ratings.push(ratingData)
      }

      localStorage.setItem('routeai-ratings', JSON.stringify(ratings))

      // Feedback göster
      setRatingFeedback(true)
      setTimeout(() => setRatingFeedback(false), 2000)
    } catch (error) {
      console.error('Rating kaydetme hatası:', error)
    }
  }

  // Önceki rating'i yükle
  useEffect(() => {
    if (!recommendation) return

    try {
      const existingRatings = localStorage.getItem('routeai-ratings')
      if (existingRatings) {
        const ratings = JSON.parse(existingRatings)
        const previousRating = ratings.find(
          (r: any) => r.query === query && r.toolName === recommendation.toolName
        )

        if (previousRating) {
          setRating(previousRating.rating)
        }
      }
    } catch (error) {
      console.error('Rating yükleme hatası:', error)
    }
  }, [recommendation, query])

  const handleStarClick = (star: number) => {
    setRating(star)
    saveRatingToLocalStorage(star)
  }

  // Konsol analizi için global fonksiyon
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

        // Araç bazlı analiz
        const toolStats: Record<string, { total: number, count: number }> = {}
        // Sorgu bazlı analiz
        const queryStats: Record<string, number> = {}

        ratings.forEach((r: any) => {
          // Tool istatistikleri
          if (!toolStats[r.toolName]) {
            toolStats[r.toolName] = { total: 0, count: 0 }
          }
          toolStats[r.toolName].total += r.rating
          toolStats[r.toolName].count += 1

          // Sorgu istatistikleri
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
          .forEach(([query, count]) => {
            console.log(`• "${query}" (${count} değerlendirme)`)
          })

      } catch (error) {
        console.error('Analiz hatası:', error)
      }
    }
  }, [])

  return (
    <>
      <WelcomeModal />
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
                  <Sparkles className="w-12 h-12 md:w-20 md:h-20 lg:w-24 lg:h-24 text-primary drop-shadow-2xl dark:drop-shadow-[0_0_20px_rgba(220,220,220,0.4)] animate-pulse"
                    style={{
                      filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6)) drop-shadow(0 0 16px hsl(var(--primary) / 0.4))'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-balance leading-[1.1]">
                <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent dark:from-foreground dark:via-primary dark:to-primary/80">
                  RouteAI
                </span>
                <span className="text-foreground/90 dark:text-foreground/80"> - </span>
                <span className="bg-gradient-to-r from-foreground/90 via-foreground to-foreground/90 bg-clip-text text-transparent dark:from-foreground dark:via-foreground/95 dark:to-foreground/80">
                  Yapay Zeka Navigatörü
                </span>
              </h1>

              <p className="text-xs md:text-sm lg:text-base font-semibold text-muted-foreground/80 dark:text-muted-foreground tracking-wide uppercase">
                300+ AI Aracı Arasından Akıllı Seçim
              </p>
            </div>

            <p className="text-sm md:text-lg lg:text-xl text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed font-normal mt-3 md:mt-6">
              Ne yapmak istediğini yaz, en uygun AI aracını sana bulalım
            </p>
          </div>

          {/* Input Section */}
          <div className="space-y-3 md:space-y-4">
            <div className="relative group">
              {/* Gradient Border */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

              {/* Input Container */}
              <div className="relative bg-card/80 dark:bg-card border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 focus-within:shadow-2xl focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/30 focus-within:ring-offset-0">
                {/* Icon */}
                <div className="absolute top-3 left-3 md:top-5 md:left-5 z-10">
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-300" />
                </div>

                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Örnek: Blog yazısı yazmak, LinkedIn postu tasarla, akademik makale özetle, logo tasarımı yap..."
                  className="w-full min-h-[100px] md:min-h-[140px] pl-11 md:pl-14 pr-3 md:pr-5 pt-3 md:pt-5 pb-3 md:pb-5 text-base md:text-lg bg-transparent border-0 rounded-2xl resize-none focus:outline-none focus:ring-0 transition-all placeholder:text-muted-foreground/60 focus:placeholder:text-muted-foreground/40"
                  style={{
                    boxShadow: 'none'
                  }}
                />
              </div>
            </div>

            <Button
              onClick={getRecommendation}
              disabled={isLoading || !query.trim()}
              className="w-full h-12 md:h-14 text-base md:text-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 md:p-6 text-center">
                <p className="text-destructive font-medium text-sm md:text-base">{error}</p>
              </div>
            </div>
          )}

          {/* Recommendation Card */}
          {recommendation && !isLoading && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="relative group">
                {/* Gradient Border */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 rounded-3xl blur-lg opacity-40 dark:opacity-30 group-hover:opacity-60 dark:group-hover:opacity-40 transition-opacity duration-500" />

                {/* Card Content */}
                <div className="relative bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/98 border border-border/50 rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-10 space-y-4 md:space-y-6 shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.4)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_30px_70px_rgba(0,0,0,0.5)] transition-all duration-500 hover:scale-[1.01]">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 md:gap-4 pb-3 md:pb-4 border-b border-border/50">
                    <div className="flex items-start gap-2 md:gap-4 flex-1 min-w-0">
                      {/* Tool Logo Placeholder */}
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Rocket className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                      </div>

                      <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                        {/* Category Badge */}
                        <div className="inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20">
                          <span className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-wide">AI</span>
                        </div>

                        {/* Tool Name */}
                        <h2 className="text-xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight leading-tight break-words">
                          <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent dark:from-foreground dark:via-primary dark:to-primary/90">
                            {recommendation.toolName}
                          </span>
                        </h2>

                        {/* Rating */}
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleStarClick(star)}
                                className="transition-all duration-200 hover:scale-110"
                              >
                                <Star
                                  className={`w-4 h-4 md:w-5 md:h-5 transition-colors cursor-pointer ${star <= rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600 hover:fill-yellow-400/50 hover:text-yellow-400/50'
                                    }`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {rating > 0 ? `${rating} yıldız` : 'Değerlendir'}
                          </span>
                          {ratingFeedback && (
                            <span className="text-[10px] md:text-xs text-primary animate-in fade-in duration-300">
                              Teşekkür ederiz! 💫
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button - Go to Tool */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={recommendation.url || getToolUrl(recommendation.toolName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm md:text-base"
                        title="AI Aracına Git"
                      >
                        <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Araca Git</span>
                      </a>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2 md:space-y-3">
                    <button
                      onClick={() => toggleSection('description')}
                      className="flex items-center justify-between w-full group/section"
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2.5 rounded-lg bg-primary/10 dark:bg-primary/20">
                          <Clipboard className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                          Açıklama
                        </div>
                      </div>
                      {expandedSections.description ? (
                        <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover/section:text-primary transition-colors flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover/section:text-primary transition-colors flex-shrink-0" />
                      )}
                    </button>
                    {expandedSections.description && (
                      <p className="text-sm md:text-base lg:text-lg leading-relaxed text-card-foreground pl-10 md:pl-14 animate-in fade-in slide-in-from-top-2 duration-300">
                        {recommendation.description}
                      </p>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="space-y-2 md:space-y-3 pt-2 border-t border-border/50">
                    <button
                      onClick={() => toggleSection('reason')}
                      className="flex items-center justify-between w-full group/section"
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2.5 rounded-lg bg-primary/10 dark:bg-primary/20">
                          <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                          Neden Bu Araç?
                        </div>
                      </div>
                      {expandedSections.reason ? (
                        <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover/section:text-primary transition-colors flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover/section:text-primary transition-colors flex-shrink-0" />
                      )}
                    </button>
                    {expandedSections.reason && (
                      <p className="text-sm md:text-base lg:text-lg leading-relaxed text-card-foreground pl-10 md:pl-14 animate-in fade-in slide-in-from-top-2 duration-300">
                        {recommendation.reason}
                      </p>
                    )}
                  </div>

                  {/* Ready Prompt - Coming Soon */}
                  <div className="space-y-2 md:space-y-3 pt-2 border-t border-border/50">
                    <button
                      onClick={() => toggleSection('prompt')}
                      className="flex items-center justify-between w-full group/section"
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2.5 rounded-lg bg-primary/10 dark:bg-primary/20">
                          <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                          Hazır Prompt
                        </div>
                      </div>
                      {expandedSections.prompt ? (
                        <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover/section:text-primary transition-colors flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover/section:text-primary transition-colors flex-shrink-0" />
                      )}
                    </button>
                    {expandedSections.prompt && (
                      <div className="pl-10 md:pl-14 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-muted/30 dark:bg-muted/20 border border-dashed border-border/50 rounded-xl p-4 md:p-5 text-center">
                          <p className="text-sm md:text-base text-muted-foreground italic">
                            🚀 Yakında eklenecek
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Benzer Araçlar Placeholder */}
                  <div className="pt-3 md:pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                        Benzer Araçlar
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground/60 italic">
                      <span>Yakında eklenecek</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
