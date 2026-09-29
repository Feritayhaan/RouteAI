"use client"

import { ExternalLink } from "lucide-react"
import { RecommendationTool } from "@/lib/types"
import { PRICE_UNVERIFIED_LABEL, getPricingModel, isPriceVerified, priceLabelOrUnknown, pricingModelLabel } from "@/lib/pricing"

// TEK rozet. Eskiden free/freemium/paidOnly bayraklarinin her biri ayri rozet
// basiyordu; freemium araclarda "Free" ve "Freemium" yan yana cikip kullaniciyi
// yaniltiyordu. Model tek oldugu icin rozet de tek.
//
// Tutar sadece son 60 gun icinde dogrulandiysa gosterilir (lib/pricing
// PRICE_STALE_AFTER_DAYS). Tarihsiz ya da eski tutar gosterilmez: yerine
// "Fiyat dogrulanmadi" ve varsa urunun fiyat sayfasi.
export default function PricingBadges({ pricing, pricingUrl }: { pricing?: RecommendationTool['pricing']; pricingUrl?: string }) {
  if (!pricing) return null

  const model = getPricingModel(pricing)
  // Ucretsizde fiyat cipi rozeti tekrar etmis olur.
  const showAmount = model !== 'free'
  const verified = isPriceVerified(pricing)

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center px-2 py-0.5 glass-chip rounded-full text-[10px] font-semibold text-muted-foreground">
        {pricingModelLabel(pricing)}
      </span>

      {showAmount && verified && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 dark:bg-black/30 text-primary text-[10px] font-semibold">
          {priceLabelOrUnknown(pricing)}
        </span>
      )}

      {showAmount && !verified && (pricingUrl ? (
        <a
          href={pricingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-900 dark:text-amber-300 hover:underline"
        >
          {PRICE_UNVERIFIED_LABEL}
          <ExternalLink className="w-2.5 h-2.5" aria-hidden />
        </a>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-900 dark:text-amber-300">
          {PRICE_UNVERIFIED_LABEL}
        </span>
      ))}

      {verified && pricing.priceCheckedAt && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/40 text-[10px] text-muted-foreground/70">
          {new Date(pricing.priceCheckedAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} verisi
        </span>
      )}
    </div>
  )
}
