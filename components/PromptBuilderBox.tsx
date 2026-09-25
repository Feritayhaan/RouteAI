"use client"

// Öneri kartındaki küçük prompt kutusu. Tıklanınca açılır; amaç (varsayılan:
// kullanıcının sorgusu) /api/prompt/start'a gider. Dönen soru kartı ya da
// prompt kartı sohbetteki bileşenlerle çizilir (aynı iyileştirme akışı).

import { useMemo, useState } from "react"
import { Loader2, Wand2, X } from "lucide-react"
import type { PromptCard as PromptCardData, PromptQuestionCard as PromptQuestionData } from "@/lib/agent/cards"
import { format, getDictionary, type Locale } from "@/lib/i18n"
import { startPrompt } from "@/lib/chat/promptApi"
import { promptProductId } from "@/lib/promptBuilder/products"
import { ChatContext, type ChatContextValue } from "@/components/chat/ChatContext"
import PromptCard from "@/components/chat/PromptCard"
import PromptQuestionCard from "@/components/chat/PromptQuestionCard"

const noop = () => {}

export default function PromptBuilderBox({ toolName, query, locale = "tr" }: { toolName: string; query: string; locale?: Locale }) {
  const productId = promptProductId(toolName)
  const dict = getDictionary(locale)
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState(query)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [card, setCard] = useState<PromptCardData | PromptQuestionData | null>(null)

  const ctx: ChatContextValue = useMemo(
    () => ({ locale, dict, sessionId: "", onToolOpen: noop, onPromptCopied: noop, send: noop, busy: false }),
    [locale, dict]
  )

  if (!productId) return null

  const build = async () => {
    if (loading || goal.trim().length < 2) return
    setLoading(true)
    setError(null)
    const result = await startPrompt(productId, goal.trim(), locale)
    setLoading(false)
    if ("error" in result) setError(dict.prompt.startError)
    else setCard(result.card)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs md:text-sm font-medium text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Wand2 className="w-4 h-4" aria-hidden />
        {dict.prompt.boxTitle}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4 space-y-3 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Wand2 className="w-4 h-4" aria-hidden />
          {dict.prompt.boxTitle}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={dict.prompt.close}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {card ? (
        <ChatContext.Provider value={ctx}>
          {card.type === "prompt_question" ? <PromptQuestionCard card={card} /> : <PromptCard card={card} />}
        </ChatContext.Provider>
      ) : (
        <>
          <p className="text-xs md:text-sm text-muted-foreground">{format(dict.prompt.boxHint, { product: toolName })}</p>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{dict.prompt.goalLabel}</span>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-border/60 bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={build}
              disabled={loading || goal.trim().length < 2}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {loading ? dict.prompt.loading : dict.prompt.generate}
            </button>
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          </div>
        </>
      )}
    </div>
  )
}
