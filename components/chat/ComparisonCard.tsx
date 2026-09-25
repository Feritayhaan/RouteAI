"use client"

import { useEffect, useState } from "react"
import { trackEvent } from "@/lib/analytics/client"
import { format } from "@/lib/i18n"
import type { ToolClick } from "@/lib/chat/outcomes"
import { useChatContext } from "./ChatContext"

/** Aynı görevde iki farklı ürün açıldıysa: "Hangisi daha iyiydi?" */
export default function ComparisonCard({ taskId, a, b, onDone }: { taskId: string; a: ToolClick; b: ToolClick; onDone?: () => void }) {
  const { dict, sessionId } = useChatContext()
  const [sent, setSent] = useState(false)

  useEffect(() => {
    trackEvent("outcome_shown", { taskId })
  }, [taskId])

  const pick = (winner: string) => {
    setSent(true)
    trackEvent("comparison_answered", { taskId })
    onDone?.()
    fetch("/api/outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "comparison", sessionId, taskId, productA: a.productId, productB: b.productId, winner }),
    }).catch(() => {})
  }

  if (sent) {
    return <p role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">{dict.comparison.thanks}</p>
  }

  const question = format(dict.comparison.question, { a: a.productName, b: b.productName })
  const btn = "min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <fieldset className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <legend className="sr-only">{question}</legend>
      <p className="font-semibold" aria-hidden>{question}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => pick(a.productId)}>{a.productName}</button>
        <button type="button" className={btn} onClick={() => pick(b.productId)}>{b.productName}</button>
        <button type="button" className={btn} onClick={() => pick("tie")}>{dict.comparison.same}</button>
      </div>
    </fieldset>
  )
}
