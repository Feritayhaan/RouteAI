"use client"

// Çok adımlı öneri: her adım tek satır ("1. Senaryo → ChatGPT"), ayrıntı ve
// adım promptu satır açılınca. Süre ya da maliyet tahmini gösterilmez: kaynağı
// olmayan sayı yazılmaz; her aracın fiyatı katalogdaki tarihiyle adımın içinde.

import { useState } from "react"
import { Workflow } from "lucide-react"
import { format, getDictionary, type Locale } from "@/lib/i18n"
import { promptProductId } from "@/lib/promptBuilder/products"
import type { WorkflowData } from "@/lib/types"
import WorkflowStepCard, { type StepPromptCard } from "./WorkflowStepCard"

const toggled = (set: Set<number>, order: number) => {
  const next = new Set(set)
  if (next.has(order)) next.delete(order)
  else next.add(order)
  return next
}

export default function WorkflowDisplay({ workflow, goal, locale = "tr", autoPrompt = false }: {
  workflow: WorkflowData
  /** Kullanıcının ilk girişi: adım promptlarının amacı. */
  goal: string
  locale?: Locale
  /** "Prompt da yaz" açık: prompt yazılabilen ilk adımın promptu açılır. */
  autoPrompt?: boolean
}) {
  const dict = getDictionary(locale)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [prompts, setPrompts] = useState<Set<number>>(new Set())
  const [cache] = useState(() => new Map<string, StepPromptCard>())

  // autoPrompt açıldığında (ilk render dahil) rehberi olan ilk adımı aç.
  const [autoSeen, setAutoSeen] = useState(false)
  if (autoPrompt !== autoSeen) {
    setAutoSeen(autoPrompt)
    const first = autoPrompt ? workflow.steps.find((s) => promptProductId(s.primary.toolName)) : undefined
    if (first) {
      setExpanded((prev) => new Set(prev).add(first.order))
      setPrompts((prev) => new Set(prev).add(first.order))
    }
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700" aria-label={workflow.name}>
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 rounded-3xl blur-lg opacity-40 dark:opacity-30 group-hover:opacity-60 transition-opacity duration-500" />

        <div className="glass-strong relative rounded-2xl p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
              <Workflow className="w-5 h-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide">
                {dict.workflow.title} · {format(dict.workflow.steps, { n: workflow.steps.length })}
              </p>
              <h2 className="text-lg md:text-xl font-black tracking-tight leading-tight">{workflow.name}</h2>
            </div>
          </div>

          <ol className="space-y-2">
            {workflow.steps.map((step) => (
              <WorkflowStepCard
                key={step.order}
                step={step}
                dict={dict}
                isExpanded={expanded.has(step.order)}
                onToggle={() => setExpanded((prev) => toggled(prev, step.order))}
                prompt={{
                  goal,
                  locale,
                  open: prompts.has(step.order),
                  onToggle: () => setPrompts((prev) => toggled(prev, step.order)),
                  cache,
                }}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
