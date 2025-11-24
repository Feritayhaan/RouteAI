"use client"

import { useState, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface Recommendation {
  toolName: string
  description: string
  reason: string
  suggestedPrompt: string
}

export default function Home() {
  const [query, setQuery] = useState("")
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getRecommendation = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setRecommendation(null)

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

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
            AI Aracı Bul
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            İhtiyacına en uygun AI aracını keşfet
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ne yapmak istiyorsun? (Örnek: Blog yazısı yazmak istiyorum)"
              className="w-full min-h-[120px] p-6 text-lg bg-card border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
            />
          </div>

          <Button
            onClick={getRecommendation}
            disabled={isLoading || !query.trim()}
            className="w-full h-14 text-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Recommendation Card */}
        {recommendation && !isLoading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border rounded-xl p-8 space-y-6 shadow-lg">
              {/* Tool Name */}
              <div>
                <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-medium">
                  Önerilen Araç
                </div>
                <h2 className="text-3xl font-bold text-foreground">
                  {recommendation.toolName}
                </h2>
              </div>

              {/* Description */}
              <div>
                <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                  Açıklama
                </div>
                <p className="text-base leading-relaxed text-card-foreground">
                  {recommendation.description}
                </p>
              </div>

              {/* Reason */}
              <div>
                <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                  Neden Bu Araç?
                </div>
                <p className="text-base leading-relaxed text-card-foreground">
                  {recommendation.reason}
                </p>
              </div>

              {/* Ready Prompt Placeholder */}
              <div>
                <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                  Hazır Prompt
                </div>
                <p className="text-base italic text-muted-foreground bg-muted/40 border border-dashed border-border rounded-lg p-4">
                  Yakında gelecek
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
