"use client"

// Ana sayfada öneri kartının altındaki prompt bölümü. Açılınca (mount)
// /api/prompt/start'a bir kez gider; hedef ya da amaç değişince üst bileşen
// key ile yeniden kurar. Aynı hedef + amaç için önceki sonuç (cached) varsa
// yeniden üretmez. Soru kartı ve prompt kartı mevcut bileşenlerle çizilir.

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Wand2 } from "lucide-react"
import type { PromptCard as PromptCardData, PromptQuestionCard as PromptQuestionData } from "@/lib/agent/cards"
import { format, getDictionary, type Locale } from "@/lib/i18n"
import { startPrompt } from "@/lib/chat/promptApi"
import type { PromptTarget } from "@/lib/promptBuilder/products"
import { ChatContext, type ChatContextValue } from "@/components/chat/ChatContext"
import PromptCard from "@/components/chat/PromptCard"
import PromptQuestionCard from "@/components/chat/PromptQuestionCard"

const noop = () => {}
const box = "rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-lg"

type Card = PromptCardData | PromptQuestionData
type State = { status: "loading" } | { status: "error" } | { status: "done"; card: Card }

export default function PromptPanel({ target, goal, locale = "tr", cached, onResult }: {
  target: PromptTarget
  goal: string
  locale?: Locale
  cached?: Card
  onResult?: (card: Card) => void
}) {
  const dict = getDictionary(locale)
  const productId = "productId" in target ? target.productId : null
  const toolName = "productId" in target ? target.toolName : target.missing
  // Sadece ilk kurulumdaki önbellek ve güncel geri çağırma: üst bileşen her
  // render'da yeni fonksiyon verir; effect bunlara bağlanırsa istek tekrarlanır.
  const [initialCard] = useState(cached)
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  })
  const [state, setState] = useState<State>(initialCard ? { status: "done", card: initialCard } : { status: "loading" })
  const [attempt, setAttempt] = useState(0)

  const ctx: ChatContextValue = useMemo(
    () => ({ locale, dict, sessionId: "", onToolOpen: noop, onPromptCopied: noop, send: noop, busy: false }),
    [locale, dict]
  )

  useEffect(() => {
    if (!productId || (initialCard && attempt === 0)) return
    let cancelled = false
    startPrompt(productId, goal, locale).then((result) => {
      if (cancelled) return
      if ("error" in result) {
        setState({ status: "error" })
        return
      }
      setState({ status: "done", card: result.card })
      onResultRef.current?.(result.card)
    })
    return () => {
      cancelled = true
    }
  }, [productId, goal, locale, attempt, initialCard])

  const retry = () => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }

  return (
    <section className="space-y-2 animate-in fade-in slide-in-from-bottom-8 duration-700" aria-live="polite">
      <div className="flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
        <Wand2 className="w-4 h-4 text-primary" aria-hidden />
        {format(dict.prompt.panelTitle, { product: toolName })}
      </div>

      {!productId ? (
        <div className={box}>
          <p className="text-sm text-muted-foreground">{format(dict.prompt.noGuide, { product: toolName })}</p>
        </div>
      ) : state.status === "loading" ? (
        <div className={`${box} space-y-3`} aria-busy="true">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            {dict.prompt.loading}
          </div>
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
        </div>
      ) : state.status === "error" ? (
        <div className={`${box} flex flex-wrap items-center gap-3`}>
          <p className="text-sm text-destructive" role="alert">{dict.prompt.startError}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.chat.retry}
          </button>
        </div>
      ) : (
        <ChatContext.Provider value={ctx}>
          {state.card.type === "prompt_question" ? <PromptQuestionCard card={state.card} /> : <PromptCard card={state.card} />}
        </ChatContext.Provider>
      )}
    </section>
  )
}
