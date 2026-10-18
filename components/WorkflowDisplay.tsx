"use client"

// Çok adımlı öneri: her adım tek satır ("1. Senaryo → ChatGPT"), ayrıntı ve
// adım promptu satır açılınca. Süre ya da maliyet tahmini gösterilmez: kaynağı
// olmayan sayı yazılmaz; her aracın fiyatı katalogdaki tarihiyle adımın içinde.
// Geniş ekranda (useDevice().split) adım promptu adımın içinde değil sağ sütunda,
// sticky açılır; aynı anda bir adım. Dar ekranda bugünkü gibi adımın içinde.

import { useState } from "react"
import { Wand2, Workflow } from "lucide-react"
import { format, getDictionary, type Locale } from "@/lib/i18n"
import { promptProductId } from "@/lib/promptBuilder/products"
import type { WorkflowData } from "@/lib/types"
import { useDevice } from "./device/DeviceProvider"
import { sidePanel } from "./layout"
import PromptPanel from "./PromptPanel"
import WorkflowStepCard, { stepPromptInput, type StepPromptCard } from "./WorkflowStepCard"

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
  const { split } = useDevice()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [prompts, setPrompts] = useState<Set<number>>(new Set())
  // Yan panelde gösterilen adım: en son promptu açılan.
  const [focused, setFocused] = useState<number | null>(null)
  const [cache] = useState(() => new Map<string, StepPromptCard>())

  const togglePrompt = (order: number) => {
    // Yan panelde başka bir adım gösteriliyorsa düğme o adıma geçirir (kapatmaz).
    const closing = prompts.has(order) && (!split || focused === order)
    setPrompts((prev) => {
      const next = new Set(prev)
      if (closing) next.delete(order)
      else next.add(order)
      return next
    })
    setFocused(closing ? null : order)
  }

  // autoPrompt açıldığında (ilk render dahil) rehberi olan ilk adımı aç.
  const [autoSeen, setAutoSeen] = useState(false)
  if (autoPrompt !== autoSeen) {
    setAutoSeen(autoPrompt)
    const first = autoPrompt ? workflow.steps.find((s) => promptProductId(s.primary.toolName)) : undefined
    if (first) {
      setExpanded((prev) => new Set(prev).add(first.order))
      setPrompts((prev) => new Set(prev).add(first.order))
      setFocused(first.order)
    }
  }

  const sideStep = split && focused !== null && prompts.has(focused) ? workflow.steps.find((s) => s.order === focused) : undefined
  const side = sideStep ? stepPromptInput(sideStep, goal, dict) : null

  return (
    <section
      className={`animate-in fade-in slide-in-from-bottom-8 duration-700 motion-reduce:animate-none ${side ? "lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start" : "mx-auto w-full max-w-2xl"}`}
      aria-label={workflow.name}
    >
      <div className="relative group">
        {/* Kart arkası parıltı: mobilde yok (blur kaydırmayı ağırlaştırır) */}
        <div className="mobile:hidden absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 rounded-3xl blur-lg opacity-40 dark:opacity-30 group-hover:opacity-60 transition-opacity duration-500" />

        <div className="relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl p-4 md:p-5 space-y-3 shadow-2xl mobile:shadow-lg">
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
                  open: split ? sideStep?.order === step.order : prompts.has(step.order),
                  onToggle: () => togglePrompt(step.order),
                  cache,
                  placement: split ? "side" : "inline",
                }}
              />
            ))}
          </ol>
        </div>
      </div>

      {sideStep && side?.productId && (
        <div className={`mt-6 lg:mt-0 space-y-2 ${sidePanel}`}>
          <p className="flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
            <span className="w-6 h-6 shrink-0 rounded-full bg-primary/15 text-primary font-bold text-[11px] flex items-center justify-center">{sideStep.order}</span>
            {sideStep.name}
            <Wand2 className="ml-auto w-3.5 h-3.5 text-primary" aria-hidden />
          </p>
          <PromptPanel
            key={side.cacheKey}
            target={{ productId: side.productId, toolName: sideStep.primary.toolName }}
            goal={side.goal}
            locale={locale}
            cached={cache.get(side.cacheKey)}
            onResult={(card) => cache.set(side.cacheKey, card)}
          />
        </div>
      )}
    </section>
  )
}
