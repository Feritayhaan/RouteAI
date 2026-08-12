"use client"

import { RecommendationTool } from "@/lib/types"
import { getPricingModel, priceLabelOrUnknown, pricingModelLabel } from "@/lib/pricing"

// TEK rozet. Eskiden free/freemium/paidOnly bayraklarinin her biri ayri rozet
// basiyordu; freemium araclarda "Free" ve "Freemium" yan yana cikip kullaniciyi
// yaniltiyordu. Model tek oldugu icin rozet de tek.
export default function PricingBadges({ pricing }: { pricing?: RecommendationTool['pricing'] }) {
  if (!pricing) return null

  const model = getPricingModel(pricing)
  // Ucretsizde fiyat cipi rozeti tekrar etmis olur.
  const priceLabel = model === 'free' ? null : priceLabelOrUnknown(pricing)
  const isStale = pricing.priceStatus === 'stale'

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 dark:bg-muted/30 text-[10px] font-semibold text-muted-foreground">
        {pricingModelLabel(pricing)}
      </span>

      {priceLabel !== null && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
          {priceLabel}
        </span>
      )}

      {isStale && (
        <span
          title="Fiyat en son 60 günden önce doğrulandı"
          className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold"
        >
          Fiyat güncel olmayabilir
        </span>
      )}
    </div>
  )
}
