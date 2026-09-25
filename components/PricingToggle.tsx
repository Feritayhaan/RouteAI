"use client"

// Fiyat filtresi: tek küçük düğme (tema düğmesiyle aynı görünüm). Her
// tıklamada sırayla: tümü -> ücretsiz -> ücretli -> tümü. Filtre açıkken
// (ücretsiz/ücretli) düğme vurgulu olur; adı üzerine gelince görünür.

import { CircleDollarSign, CreditCard, Gift } from "lucide-react"

export type PricingFilter = "all" | "free" | "paid"

const NEXT: Record<PricingFilter, PricingFilter> = { all: "free", free: "paid", paid: "all" }

const STATES: Record<PricingFilter, { label: string; Icon: typeof Gift }> = {
  all: { label: "Tümü (ücretli + ücretsiz)", Icon: CircleDollarSign },
  free: { label: "Sadece ücretsiz", Icon: Gift },
  paid: { label: "Sadece ücretli", Icon: CreditCard },
}

export default function PricingToggle({ value, onChange }: { value: PricingFilter; onChange: (v: PricingFilter) => void }) {
  const { label, Icon } = STATES[value]
  const active = value !== "all"
  return (
    <button
      type="button"
      onClick={() => onChange(NEXT[value])}
      aria-label={`Fiyat: ${label}`}
      className={`group relative border rounded-2xl shadow-lg p-2.5 md:p-3
                  hover:scale-105 active:scale-95 transition-all duration-300 ease-out
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card/80 dark:bg-card backdrop-blur-lg border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}
    >
      <Icon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" aria-hidden />

      {/* Tooltip (tema düğmesiyle aynı) */}
      <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5
                       bg-popover border border-border rounded-lg text-xs font-medium
                       text-popover-foreground whitespace-nowrap z-20
                       opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 scale-90 group-hover:scale-100
                       transition-all duration-200 pointer-events-none shadow-lg">
        {label}
      </span>
    </button>
  )
}
