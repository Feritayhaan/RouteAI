"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Loader2, MessageCircle, Send } from "lucide-react"
import type { PromptCard as Card } from "@/lib/agent/cards"
import { format } from "@/lib/i18n"
import { trackEvent } from "@/lib/analytics/client"
import { chatPrompt, refinePrompt, type RefineRequest } from "@/lib/chat/promptApi"
import { useChatContext } from "./ChatContext"

type VariantId = "safe" | "creative"
type ChatMessage = { id: number; role: "user" | "bot" | "error"; text: string; versionN?: number }

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
 * Prompt kartı: varyant sekmeleri, varsayımlar (tıklayınca seçenekler), sürüm
 * geçmişi; sohbet ("Sohbetle düzenle") prompt kartının ALTINDA, kopuk ayrı bir kart. Düzenleme hazır düğmelerle değil yazarak yapılır:
 * "sonuna uyarı ekle", "2. maddeyi sil", "geri al". Her düzenleme, o an
 * gösterilen sürümün üstüne yeni sürüm üretir; "geri al" eski sürümü gösterir.
 * Hata olursa son geçerli sürüm kalır.
 */
export default function PromptCard({ card: initial }: { card: Card }) {
  const { dict, onPromptCopied } = useChatContext()
  const [versions, setVersions] = useState<Card[]>([initial])
  const [index, setIndex] = useState(0)
  const [variant, setVariant] = useState<VariantId>("safe")
  const [openAssumption, setOpenAssumption] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [thread, setThread] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tabIds = { safe: useId(), creative: useId() }
  const panelId = useId()
  const inputId = useId()
  const chatTitleId = useId()
  const tracked = useRef(new Set<number>())
  const messageId = useRef(0)

  const card = versions[index]
  const current = card.variants.find((v) => v.id === variant) ?? card.variants[0]

  useEffect(() => {
    if (tracked.current.has(card.versionN)) return
    tracked.current.add(card.versionN)
    trackEvent("prompt_generated", { guideId: card.guideId, guideVersion: card.guideVersion })
  }, [card])

  const say = (role: ChatMessage["role"], text: string, versionN?: number) =>
    setThread((prev) => [...prev, { id: ++messageId.current, role, text, ...(versionN ? { versionN } : {}) }])

  const errorText = (code: string) => (code === "expired" ? dict.prompt.expired : code === "refine_limit" ? dict.prompt.limit : dict.prompt.error)

  /** Sunucudan gelen sürümü göster: listede varsa ona geç (geri al), yoksa sona ekle. */
  const showCard = (next: Card) => {
    const at = versions.findIndex((v) => v.versionN === next.versionN)
    if (at >= 0) {
      setIndex(at)
    } else {
      setVersions([...versions, next])
      setIndex(versions.length)
    }
    setOpenAssumption(null)
  }

  // Varsayım değiştirme (kartın ortasındaki "Değiştir"): yeni sürüm üretir.
  const refine = async (action: RefineRequest, refinementId: string) => {
    if (loading) return
    setLoading(true)
    setError(null)
    trackEvent("prompt_refined", { guideId: card.guideId, guideVersion: card.guideVersion, refinementId })
    const result = await refinePrompt(card.promptSessionId, action)
    setLoading(false)
    if ("error" in result) {
      setError(errorText(result.error))
      return
    }
    showCard(result.card)
    say("bot", dict.prompt.chatAssumptionDone, result.card.versionN)
  }

  // Sohbet: kullanıcının yazdığı mesaj. Sunucu düzenler, eski sürüme döner ya da cevap verir.
  const send = async () => {
    const text = draft.trim()
    if (loading || text.length < 2) return
    setDraft("")
    setError(null)
    say("user", text)
    setLoading(true)
    const result = await chatPrompt(card.promptSessionId, text, card.versionN)
    setLoading(false)
    if ("error" in result) {
      say("error", errorText(result.error))
      setDraft(text)
      return
    }
    if (result.action !== "reply") {
      // Sadece gerçek düzenleme "iyileştirme" sayılır; geri al sayılmaz.
      if (result.action === "edit") trackEvent("prompt_refined", { guideId: card.guideId, guideVersion: card.guideVersion, refinementId: "chat" })
      showCard(result.card)
    }
    say("bot", result.reply, result.action === "reply" ? undefined : result.card.versionN)
  }

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const next: VariantId = variant === "safe" ? "creative" : "safe"
      setVariant(next)
      document.getElementById(tabIds[next])?.focus()
    }
  }

  // Kalan hak, gösterilen (belki eski) sürüme göre değil en yeni cevaba göre sayılır; hak azalır, artmaz.
  const refinementsLeft = Math.min(...versions.map((v) => v.refinementsLeft))
  const outOfRefinements = refinementsLeft === 0
  // Varsayım değiştirmek yeni sürüm üretir (hak harcar); sohbet kutusu hak bitse de açık kalır ("geri al" ücretsiz).
  const busy = loading || outOfRefinements

  return (
    <div className="space-y-3">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-busy={loading}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-bold">{format(dict.prompt.title, { product: card.productName })}</h3>
          {card.genericGuide && (
            <span title={dict.prompt.genericHint} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {dict.prompt.generic}
            </span>
          )}
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
          <pre className={`whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 font-mono text-sm leading-relaxed transition-opacity ${loading ? "opacity-50" : ""}`}>{current.prompt}</pre>
          {current.negativePrompt && (
            <p className="text-xs"><span className="font-semibold">{dict.prompt.negative}:</span> <span className="font-mono">{current.negativePrompt}</span></p>
          )}
          {current.validation.status === "unchecked" && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{format(dict.prompt.unchecked, { errors: current.validation.errors.join(" ") })}</p>
          )}
          {/* Mobilde kart ekrandayken Kopyala / Araca Git altta sabit (kart geçilince kendiliğinden gider) */}
          <div className="flex flex-wrap gap-2 mobile:sticky mobile:bottom-0 mobile:z-10 mobile:-mx-4 mobile:border-t mobile:border-border/60 mobile:bg-card/95 mobile:px-4 mobile:pt-2 mobile:pb-[max(0.5rem,env(safe-area-inset-bottom))] mobile:backdrop-blur">
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
      </div>

      <section aria-labelledby={chatTitleId} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          <h4 id={chatTitleId}>{dict.prompt.refine}</h4>
          <span className="ml-auto font-normal normal-case">{format(dict.prompt.refinementsLeft, { n: refinementsLeft })}</span>
        </div>
        {outOfRefinements && <p className="text-xs text-amber-700 dark:text-amber-300">{dict.prompt.limit}</p>}
        {thread.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.prompt.chatHint}</p>
        ) : (
          <ul role="log" aria-live="polite" aria-label={dict.prompt.chatLog} className="space-y-2">
            {thread.map((m) => (
              <li key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] break-words rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : m.role === "error"
                        ? "rounded-bl-md border border-destructive/40 bg-destructive/10 text-destructive"
                        : "rounded-bl-md bg-muted"
                  }`}
                  role={m.role === "error" ? "alert" : undefined}
                >
                  {m.text}
                  {m.versionN ? <span className="ml-2 text-[11px] opacity-70">{format(dict.prompt.chatVersionTag, { n: m.versionN })}</span> : null}
                </div>
              </li>
            ))}
            {loading && (
              <li className="flex justify-start" role="status">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {dict.prompt.loading}
                </div>
              </li>
            )}
          </ul>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <label htmlFor={inputId} className="sr-only">{dict.prompt.freeText}</label>
          <input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={dict.prompt.freeTextPlaceholder}
            maxLength={1000}
            disabled={loading}
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" disabled={loading || draft.trim().length < 2} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Send className="h-4 w-4" aria-hidden />
            {dict.prompt.apply}
          </button>
        </form>
      </section>
    </div>
  )
}
