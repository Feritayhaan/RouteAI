"use client"

import { useEffect, useId, useState } from "react"
import { Loader2 } from "lucide-react"
import type { PromptCard as PromptCardData, PromptQuestionCard as Card } from "@/lib/agent/cards"
import { format } from "@/lib/i18n"
import { trackEvent } from "@/lib/analytics"
import { answerPromptQuestions } from "@/lib/chat/promptApi"
import { useChatContext } from "./ChatContext"
import PromptCard from "./PromptCard"

/**
 * Prompt için eksik bilgiler: en fazla 3 soru tek kartta. Hepsi boş
 * geçilebilir ("Sen seç"). Cevaplar sohbet mesajı olarak değil doğrudan
 * /api/prompt/answer'a gider; dönen PromptCard kartın altında açılır.
 */
export default function PromptQuestionCard({ card }: { card: Card }) {
  const { dict } = useChatContext()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PromptCardData | null>(null)
  const baseId = useId()

  useEffect(() => {
    trackEvent("prompt_question_shown", { guideId: card.guideId })
  }, [card.guideId])

  const submit = async () => {
    setLoading(true)
    setError(null)
    const out = await answerPromptQuestions(card.promptSessionId, answers)
    setLoading(false)
    if ("error" in out) setError(out.error === "expired" ? dict.prompt.expired : dict.prompt.error)
    else setResult(out.card)
  }

  if (result) return <PromptCard card={result} />

  const chip = "min-h-11 rounded-xl border border-border bg-card px-3 text-sm hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <p className="font-semibold">{format(dict.prompt.questionTitle, { product: card.productName })}</p>
      {card.questions.map((q, i) => {
        const selected = answers[q.slotId]
        const isFree = selected !== undefined && selected !== "auto" && !q.options.some((o) => o.id === selected)
        return (
          <fieldset key={q.slotId} className="space-y-2" disabled={loading}>
            <legend className="text-sm font-medium">{q.question}</legend>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o) => (
                <button key={o.id} type="button" className={chip} aria-pressed={selected === o.id} onClick={() => setAnswers({ ...answers, [q.slotId]: o.id })}>
                  {o.label}
                </button>
              ))}
              <button type="button" className={`${chip} border-dashed`} aria-pressed={selected === "auto" || selected === undefined} onClick={() => setAnswers({ ...answers, [q.slotId]: "auto" })}>
                {dict.prompt.auto}
              </button>
            </div>
            {q.allowFreeText && (
              <>
                <label htmlFor={`${baseId}-${i}`} className="sr-only">{dict.prompt.otherPlaceholder}</label>
                <input
                  id={`${baseId}-${i}`}
                  value={isFree ? selected : ""}
                  onChange={(e) => setAnswers({ ...answers, [q.slotId]: e.target.value || "auto" })}
                  placeholder={dict.prompt.otherPlaceholder}
                  maxLength={200}
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </>
            )}
          </fieldset>
        )
      })}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {loading ? dict.prompt.loading : dict.prompt.generate}
      </button>
    </div>
  )
}
