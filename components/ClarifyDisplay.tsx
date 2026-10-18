"use client"

// v3: görev belirsiz. "Şunu mu demek istedin?" + görev düğmeleri; seçilen
// görevle aynı sorgu yeniden istenir (HomeClient, /api/recommend taskId).
// Üç durum (clarify.reason):
//  - yok: sorgu birden fazla işe uyuyor
//  - 'no_match' / 'unclear': tam uyan iş yok; en yakın işler ya da başlangıç işleri sunulur
//  - 'spelling': tek kelime bir ürün adının yazım hatası olabilir; düzeltilmiş sorgu tek düğmeyle aranır

import { useEffect } from "react"
import { HelpCircle } from "lucide-react"
import { trackEvent } from "@/lib/analytics/client"
import type { Dictionary } from "@/lib/i18n"
import type { ClarifyRecommendation } from "@/lib/types"

export default function ClarifyDisplay({ clarify, dict, onSelect, onSuggest, disabled = false }: {
  clarify: ClarifyRecommendation
  dict: Dictionary
  onSelect: (taskId: string) => void
  /** Yazım önerisi düğmesi: düzeltilmiş sorguyu yeniden arar. */
  onSuggest?: (suggestion: string) => void
  disabled?: boolean
}) {
  useEffect(() => {
    trackEvent("clarify_shown")
  }, [])

  const v3 = dict.v3
  const terms = clarify.unknownTerms?.join(", ") ?? ""
  const suggestion = clarify.suggestion ?? ""
  const title =
    clarify.reason === "spelling" ? v3.spellingTitle.replace("{suggestion}", suggestion)
    : clarify.reason === "no_match" ? v3.noMatchTitle
    : clarify.reason === "unclear" ? v3.unclearTitle
    : v3.clarifyTitle
  const hint =
    clarify.reason === "spelling" ? v3.spellingHint.replace("{from}", terms || suggestion)
    : clarify.reason === "no_match" ? (terms ? v3.noMatchTermsHint.replace("{terms}", terms) : v3.noMatchHint)
    : clarify.reason === "unclear" ? v3.unclearHint
    : v3.clarifyHint

  return (
    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700" aria-labelledby="clarify-title">
      <div className="relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl p-4 md:p-6 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 id="clarify-title" className="text-lg md:text-xl font-black tracking-tight leading-tight">{title}</h2>
            <p className="text-xs md:text-sm text-muted-foreground">{hint}</p>
          </div>
        </div>
        {clarify.reason === "spelling" && suggestion && onSuggest && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSuggest(suggestion)}
            className="min-h-11 w-full rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary break-words hover:bg-primary/10 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            {v3.spellingYes.replace("{suggestion}", suggestion)}
          </button>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {clarify.options.map((o) => (
            <button
              key={o.taskId}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(o.taskId)}
              className="min-h-11 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary break-words hover:bg-primary/10 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
