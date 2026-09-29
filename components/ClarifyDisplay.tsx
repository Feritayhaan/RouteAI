"use client"

// v3: görev belirsiz. "Şunu mu demek istedin?" + görev düğmeleri; seçilen
// görevle aynı sorgu yeniden istenir (HomeClient, /api/recommend taskId).

import { useEffect } from "react"
import { HelpCircle } from "lucide-react"
import { trackEvent } from "@/lib/analytics/client"
import type { Dictionary } from "@/lib/i18n"
import type { ClarifyRecommendation } from "@/lib/types"

export default function ClarifyDisplay({ clarify, dict, onSelect, disabled = false }: {
  clarify: ClarifyRecommendation
  dict: Dictionary
  onSelect: (taskId: string) => void
  disabled?: boolean
}) {
  useEffect(() => {
    trackEvent("clarify_shown")
  }, [])

  return (
    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700" aria-labelledby="clarify-title">
      <div className="glass-strong relative rounded-2xl p-4 md:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 id="clarify-title" className="text-lg md:text-xl font-black tracking-tight leading-tight">{dict.v3.clarifyTitle}</h2>
            <p className="text-xs md:text-sm text-muted-foreground">{dict.v3.clarifyHint}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {clarify.options.map((o) => (
            <button
              key={o.taskId}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(o.taskId)}
              className="glass-control min-h-11 rounded-2xl px-3 py-2 text-sm font-semibold text-primary break-words disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
