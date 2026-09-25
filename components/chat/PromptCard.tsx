"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Sparkles } from "lucide-react"
import type { PromptCard as Card } from "@/lib/agent/cards"
import { format } from "@/lib/i18n"
import { trackEvent } from "@/lib/analytics/client"
import { refinePrompt, type RefineRequest } from "@/lib/chat/promptApi"
import { useChatContext } from "./ChatContext"

type VariantId = "safe" | "creative"

export function CopyPromptButton({ text, onCopied }: { text: string; onCopied?: () => void }) {
  const { dict } = useChatContext()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // pano izni yok: sessiz geç
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span role="status">{copied ? dict.prompt.copied : dict.prompt.copy}</span>
    </button>
  )
}

const chip = "min-h-11 rounded-xl border border-border bg-card px-3 text-sm hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Prompt kartı: varyant sekmeleri, varsayımlar (tıklayınca seçenekler),
 * iyileştirme butonları, serbest talimat, sürüm geçmişi. Her iyileştirme
 * yeni sürüm üretir; hata olursa son geçerli sürüm kalır.
 */
export default function PromptCard({ card: initial }: { card: Card }) {
  const { dict, onPromptCopied } = useChatContext()
  const [versions, setVersions] = useState<Card[]>([initial])
  const [index, setIndex] = useState(0)
  const [variant, setVariant] = useState<VariantId>("safe")
  const [openAssumption, setOpenAssumption] = useState<string | null>(null)
  const [instruction, setInstruction] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tabIds = { safe: useId(), creative: useId() }
  const panelId = useId()
  const inputId = useId()
  const tracked = useRef(new Set<number>())

  const card = versions[index]
  const current = card.variants.find((v) => v.id === variant) ?? card.variants[0]

  useEffect(() => {
    if (tracked.current.has(card.versionN)) return
    tracked.current.add(card.versionN)
    trackEvent("prompt_generated", { guideId: card.guideId, guideVersion: card.guideVersion })
  }, [card])

  const refine = async (action: RefineRequest, refinementId: string) => {
    if (loading) return
    setLoading(true)
    setError(null)
    trackEvent("prompt_refined", { guideId: card.guideId, guideVersion: card.guideVersion, refinementId })
    const result = await refinePrompt(card.promptSessionId, action)
    setLoading(false)
    if ("error" in result) {
      setError(result.error === "expired" ? dict.prompt.expired : result.error === "refine_limit" ? dict.prompt.limit : dict.prompt.error)
      return
    }
    setVersions((prev) => [...prev, result.card])
    setIndex(versions.length)
    setOpenAssumption(null)
    setInstruction("")
  }

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const next: VariantId = variant === "safe" ? "creative" : "safe"
      setVariant(next)
      document.getElementById(tabIds[next])?.focus()
    }
  }

  const outOfRefinements = card.refinementsLeft === 0
  const busy = loading || outOfRefinements

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold">{format(dict.prompt.title, { product: card.productName })}</h3>
        {card.draft && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            {dict.prompt.draft}
          </span>
        )}
        {versions.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <button type="button" aria-label={dict.prompt.previous} disabled={index === 0 || loading} onClick={() => setIndex(index - 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span aria-live="polite">{format(dict.prompt.version, { n: index + 1, total: versions.length })}</span>
            <button type="button" aria-label={dict.prompt.next} disabled={index === versions.length - 1 || loading} onClick={() => setIndex(index + 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {card.variants.length > 1 && (
        <div role="tablist" aria-label={dict.prompt.variants} className="inline-flex rounded-xl border border-border p-1">
          {(["safe", "creative"] as const).map((id) => (
            <button
              key={id}
              id={tabIds[id]}
              role="tab"
              type="button"
              aria-selected={variant === id}
              aria-controls={panelId}
              tabIndex={variant === id ? 0 : -1}
              onClick={() => setVariant(id)}
              onKeyDown={onTabKey}
              className="min-h-11 rounded-lg px-4 text-sm font-medium aria-selected:bg-primary aria-selected:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {dict.prompt[id]}
            </button>
          ))}
        </div>
      )}

      <div id={panelId} role="tabpanel" aria-labelledby={tabIds[current.id]} className="space-y-2">
        {loading ? (
          <div className="space-y-2" role="status">
            <span className="sr-only">{dict.prompt.loading}</span>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 font-mono text-sm leading-relaxed">{current.prompt}</pre>
        )}
        {current.negativePrompt && (
          <p className="text-xs"><span className="font-semibold">{dict.prompt.negative}:</span> <span className="font-mono">{current.negativePrompt}</span></p>
        )}
        {current.validation.status === "unchecked" && (
          <p className="text-xs text-amber-700 dark:text-amber-300">{format(dict.prompt.unchecked, { errors: current.validation.errors.join(" ") })}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <CopyPromptButton
            text={current.prompt}
            onCopied={() => {
              onPromptCopied({ promptSessionId: card.promptSessionId, guideId: card.guideId, guideVersion: card.guideVersion })
              trackEvent("prompt_copied", { guideId: card.guideId, guideVersion: card.guideVersion, variant: current.id })
            }}
          />
          {card.productUrl && (
            <a href={card.productUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ExternalLink className="h-4 w-4" aria-hidden />
              {dict.rec.openTool}
            </a>
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {current.settings.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">{dict.prompt.settings}</p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {current.settings.map((s) => (
              <div key={s.key} className="contents">
                <dt className="text-muted-foreground">{s.key}</dt>
                <dd className="break-words font-mono">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {card.howToUse.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">{dict.prompt.howToUse}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            {card.howToUse.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
      )}

      {card.assumptions.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">{dict.prompt.assumptions}</p>
          <ul className="mt-1 space-y-2">
            {card.assumptions.map((a) => (
              <li key={a.slotId} className="rounded-xl border border-border/70 p-2 text-sm">
                <button
                  type="button"
                  aria-expanded={openAssumption === a.slotId}
                  onClick={() => setOpenAssumption(openAssumption === a.slotId ? null : a.slotId)}
                  disabled={busy}
                  className="flex min-h-11 w-full flex-wrap items-center gap-x-2 rounded-lg px-1 text-left disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-medium">{a.question}</span>
                  <span className="font-mono text-primary">{a.value}</span>
                  <span className="text-xs text-muted-foreground">— {a.why}</span>
                  <span className="ml-auto text-xs underline">{dict.prompt.change}</span>
                </button>
                {openAssumption === a.slotId && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.options.map((o) => (
                      <button key={o.id} type="button" className={chip} disabled={busy} onClick={() => refine({ slotId: a.slotId, value: o.value }, "assumption")}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> {dict.prompt.refine}
          <span className="ml-auto font-normal normal-case">{format(dict.prompt.refinementsLeft, { n: card.refinementsLeft })}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {card.refinements.map((r) => (
            <button key={r.id} type="button" className={`${chip} ${r.kind === "suggested" ? "border-primary/40" : ""}`} disabled={busy} onClick={() => refine({ refinementId: r.id }, r.kind === "suggested" ? "suggested" : r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (instruction.trim().length >= 2) void refine({ instruction: instruction.trim() }, "free_text")
          }}
        >
          <label htmlFor={inputId} className="sr-only">{dict.prompt.freeText}</label>
          <input
            id={inputId}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={dict.prompt.freeTextPlaceholder}
            maxLength={500}
            disabled={busy}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" disabled={busy || instruction.trim().length < 2} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {dict.prompt.apply}
          </button>
        </form>
      </div>
    </div>
  )
}
