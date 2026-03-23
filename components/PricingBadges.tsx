"use client"

import { RecommendationTool } from "@/lib/types"

export default function PricingBadges({ pricing }: { pricing?: RecommendationTool['pricing'] }) {
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
