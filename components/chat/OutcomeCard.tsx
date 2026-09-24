"use client"

import { useEffect, useState } from "react"
import { trackEvent } from "@/lib/analytics/client"
import { format } from "@/lib/i18n"
import type { ToolClick } from "@/lib/chat/outcomes"
import { OUTCOME_TAGS } from "@/lib/validations/outcome"
import { useChatContext } from "./ChatContext"

type Answer = "yes" | "partial" | "no"

/** "{ürün} işini gördü mü?" — RouteAI Skoru'nun ana veri kaynağı. */
export default function OutcomeCard({ click, onDone }: { click: ToolClick; onDone?: () => void }) {
  const { dict, sessionId } = useChatContext()
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [sent, setSent] = useState(false)

  useEffect(() => {
    trackEvent("outcome_shown", { taskId: click.taskId })
  }, [click.taskId])

  const submit = (a: Answer, t: string[]) => {
    setSent(true)
    trackEvent("outcome_answered", { taskId: click.taskId })
    onDone?.()
    fetch("/api/outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "outcome",
        sessionId,
        taskId: click.taskId,
        productId: click.productId,
        answer: a,
        tags: t,
        ...(click.promptSessionId ? { promptSessionId: click.promptSessionId } : {}),
        ...(click.guideId && click.guideVersion ? { guideId: click.guideId, guideVersion: click.guideVersion } : {}),
      }),
    }).catch(() => {})
  }

  if (sent) {
    return <p role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">{dict.outcome.thanks}</p>
  }

  const btn = "min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <fieldset className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <legend className="sr-only">{format(dict.outcome.question, { product: click.productName })}</legend>
      <p className="font-semibold" aria-hidden>{format(dict.outcome.question, { product: click.productName })}</p>
      <div className="flex flex-wrap gap-2">
        {(["yes", "partial", "no"] as const).map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={answer === a}
            className={btn}
            onClick={() => (a === "yes" ? submit(a, []) : setAnswer(a))}
          >
            {dict.outcome[a]}
          </button>
        ))}
      </div>
      {answer && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{dict.outcome.why}</p>
          <div className="flex flex-wrap gap-2">
            {OUTCOME_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={tags.includes(tag)}
                className={btn}
                onClick={() => setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))}
              >
                {dict.outcome.tags[tag]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => submit(answer, tags)}
            className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.outcome.send}
          </button>
        </div>
      )}
    </fieldset>
  )
}
