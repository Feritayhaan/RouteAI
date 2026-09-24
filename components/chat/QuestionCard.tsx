"use client"

import { useId, useState } from "react"
import type { QuestionCard as Card } from "@/lib/agent/cards"
import { useChatContext } from "./ChatContext"

/** Netleştirme sorusu: seçenek tıklanınca kullanıcı mesajı olarak gönderilir. */
export default function QuestionCard({ card, active }: { card: Card; active: boolean }) {
  const { dict, send, busy } = useChatContext()
  const [answered, setAnswered] = useState<string | null>(null)
  const [other, setOther] = useState("")
  const [showOther, setShowOther] = useState(false)
  const inputId = useId()
  const disabled = !active || busy || answered !== null

  const answer = (text: string) => {
    if (disabled || !text.trim()) return
    setAnswered(text)
    send(text)
  }

  return (
    <fieldset className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4" disabled={disabled}>
      <legend className="sr-only">{card.question}</legend>
      <p className="font-semibold" aria-hidden>{card.question}</p>
      <div className="flex flex-wrap gap-2">
        {card.options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => answer(o.label)}
            aria-pressed={answered === o.label}
            className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:border-primary hover:bg-primary/10 disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {o.label}
          </button>
        ))}
        {card.allowFreeText && !showOther && (
          <button
            type="button"
            onClick={() => setShowOther(true)}
            className="min-h-11 rounded-xl border border-dashed border-border px-4 text-sm text-muted-foreground hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.question.other}
          </button>
        )}
      </div>
      {card.allowFreeText && showOther && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            answer(other)
          }}
        >
          <label htmlFor={inputId} className="sr-only">{dict.question.otherPlaceholder}</label>
          <input
            id={inputId}
            autoFocus
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder={dict.question.otherPlaceholder}
            maxLength={300}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {dict.question.submit}
          </button>
        </form>
      )}
    </fieldset>
  )
}
