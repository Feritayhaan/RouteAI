"use client"

import { useState } from "react"
import { Workflow } from "lucide-react"
import type { WorkflowCard as Card } from "@/lib/agent/cards"
import { format } from "@/lib/i18n"
import WorkflowStepCard from "@/components/WorkflowStepCard"
import type { WorkflowStep } from "@/lib/types"
import { useChatContext } from "./ChatContext"

// Ana sayfadaki kısa adım satırı (WorkflowStepCard) sohbet kartı verisine
// uyarlanarak kullanılıyor. Süre ve maliyet tahmini yok: kaynağı olmayan sayı
// gösterilmez.
export default function WorkflowCard({ card }: { card: Card }) {
  const { dict } = useChatContext()
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggle = (order: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order)
      else next.add(order)
      return next
    })

  const steps: WorkflowStep[] = card.steps.map((s) => ({
    order: s.order,
    name: s.name,
    description: s.description,
    primary: s.product
      ? { toolName: s.product.name, description: dict.rec.confidence[s.product.confidence], url: s.product.url }
      : { toolName: dict.workflow.noProduct, description: "" },
  }))

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Workflow className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {dict.workflow.title} · {format(dict.workflow.steps, { n: card.steps.length })}
          </p>
          <h3 className="text-lg font-black leading-tight">{card.name}</h3>
        </div>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => (
          <WorkflowStepCard
            key={step.order}
            step={step}
            dict={dict}
            isExpanded={open.has(step.order)}
            onToggle={() => toggle(step.order)}
          />
        ))}
      </ol>
    </div>
  )
}
