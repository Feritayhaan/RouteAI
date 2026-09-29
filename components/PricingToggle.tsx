"use client"

// Fiyat filtresi: tek düğme. Her tıklamada sırayla: tümü -> ücretsiz ->
// ücretli -> tümü. Filtre açıkken (ücretsiz/ücretli) düğme vurgulu olur.
// `wide`: ana sayfadaki filtre satırı, ikon + görünür kısa ad, tam genişlik.
// Yoksa küçük ikon düğmesi (tema düğmesiyle aynı), adı üzerine gelince görünür.

import { CircleDollarSign, CreditCard, Gift } from "lucide-react"

export type PricingFilter = "all" | "free" | "paid"

const NEXT: Record<PricingFilter, PricingFilter> = { all: "free", free: "paid", paid: "all" }

const STATES: Record<PricingFilter, { label: string; short: string; Icon: typeof Gift }> = {
  all: { label: "Tümü (ücretli + ücretsiz)", short: "Tüm fiyatlar", Icon: CircleDollarSign },
  // Ücretsiz planı olanlar (tamamen ücretsiz + freemium); "sadece ücretsiz" yazıyordu ama $20/ay araçlar da çıkıyordu.
  free: { label: "Ücretsiz planı olanlar", short: "Ücretsiz planı olan", Icon: Gift },
  paid: { label: "Sadece ücretli", short: "Sadece ücretli", Icon: CreditCard },
}

export default function PricingToggle({ value, onChange, wide = false }: { value: PricingFilter; onChange: (v: PricingFilter) => void; wide?: boolean }) {
  const { label, short, Icon } = STATES[value]
  const active = value !== "all"
  if (wide) {
    return (
      <button
        type="button"
        onClick={() => onChange(NEXT[value])}
        aria-label={`Fiyat: ${label}`}
        className={`inline-flex h-11 md:h-12 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl px-3 text-xs md:text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "glass-cta" : "glass-control text-muted-foreground hover:text-foreground"}`}
      >
        <Icon className="w-4 h-4 shrink-0" aria-hidden />
        <span className="truncate">{short}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onChange(NEXT[value])}
      aria-label={`Fiyat: ${label}`}
      className={`group relative rounded-2xl p-2.5 md:p-3
                  hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${active ? "glass-cta" : "glass-control text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" aria-hidden />

      {/* Tooltip (tema düğmesiyle aynı) */}
      <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5
                       glass-strong rounded-lg text-xs font-medium
                       text-popover-foreground whitespace-nowrap z-20
                       opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 scale-90 group-hover:scale-100
                       transition-all duration-200 pointer-events-none shadow-lg">
        {label}
      </span>
    </button>
  )
}
