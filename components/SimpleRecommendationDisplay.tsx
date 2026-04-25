"use client"

import { ExternalLink, Star, Rocket } from "lucide-react"
import { SimpleRecommendation } from "@/lib/types"
import PricingBadges from "./PricingBadges"
import CategoryBadge from "./CategoryBadge"

export default function SimpleRecommendationDisplay({
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
