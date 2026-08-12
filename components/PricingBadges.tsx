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

      {/* Uyari degil tarih: DB'deki en yeni fiyat verisi 2025-12-31, yani hicbir
          fiyat "taze" degil. "Fiyat guncel olmayabilir" rozeti 96 aracin
          hepsinde cikip sinyal tasimayi birakiyordu. Tarihi gosterip kararı
          kullaniciya birakiyoruz. */}
      {pricing.priceCheckedAt && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/40 text-[10px] text-muted-foreground/70">
          {new Date(pricing.priceCheckedAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} verisi
        </span>
      )}
    </div>
  )
}
