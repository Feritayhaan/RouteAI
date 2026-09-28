"use client"

// İş akışında tek adım: kapalıyken tek satır ("1  Senaryo → ChatGPT"),
// açılınca ayrıntı (araç açıklaması, fiyat, link, alternatif, ipuçları) ve
// araç için prompt rehberi varsa "Bu adım için prompt yaz". Prompt, kullanıcının
// amacı + adım adıyla mevcut prompt oluşturucudan (PromptPanel) gelir.

import { ArrowRight, ChevronDown, ExternalLink, Wand2 } from "lucide-react"
import type { PromptCard as PromptCardData, PromptQuestionCard as PromptQuestionData } from "@/lib/agent/cards"
import { format, type Dictionary, type Locale } from "@/lib/i18n"
import { promptProductId } from "@/lib/promptBuilder/products"
import type { WorkflowStep } from "@/lib/types"
import PricingBadges from "./PricingBadges"
import PromptPanel from "./PromptPanel"
import { onToolOpen } from "./toolOpen"

export type StepPromptCard = PromptCardData | PromptQuestionData

export interface StepPrompt {
  /** Kullanıcının ilk girişi. */
  goal: string
  locale: Locale
  open: boolean
  onToggle: () => void
  /** Aynı adım için üretilmiş prompt: kapatıp açınca yeniden üretilmez. */
  cache: Map<string, StepPromptCard>
}

export default function WorkflowStepCard({ step, isExpanded, onToggle, dict, prompt }: {
  step: WorkflowStep
  isExpanded: boolean
  onToggle: () => void
  dict: Dictionary
  /** Verilmezse prompt düğmesi gösterilmez. */
  prompt?: StepPrompt
}) {
  const productId = prompt ? promptProductId(step.primary.toolName) : null
  const detailsId = `workflow-step-${step.order}`
  const cacheKey = `${step.order}|${productId}`
  const stepGoal = prompt
    ? `${prompt.goal}\n\n${format(dict.workflow.stepGoal, { step: step.name, description: step.description })}`
    : ""

  return (
    <li className="rounded-xl border border-border/50 bg-card/50 overflow-hidden transition-colors hover:border-primary/30">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        className="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="w-7 h-7 shrink-0 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center">
          {step.order}
        </span>
        <span className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium">{step.name}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-bold text-primary">{step.primary.toolName}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {isExpanded && (
        <div id={detailsId} className="px-3 pb-3 pt-3 space-y-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground">{step.description}</p>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <PricingBadges pricing={step.primary.pricing} pricingUrl={step.primary.pricingUrl} />
              {step.primary.description && (
                <p className="text-xs text-foreground/80">{step.primary.description}</p>
              )}
            </div>
            {step.primary.url && (
              <a
                href={step.primary.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onToolOpen(step.primary, step.taskId)}
                className="shrink-0 min-h-11 inline-flex items-center gap-1 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ExternalLink className="w-3 h-3" aria-hidden />
                {dict.workflow.open}
              </a>
            )}
          </div>

          {step.alternative && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{dict.workflow.alternative}:</span>
              {step.alternative.url ? (
                <a
                  href={step.alternative.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => step.alternative && onToolOpen(step.alternative, step.taskId)}
                  className="font-semibold text-foreground underline underline-offset-2 hover:text-primary"
                >
                  {step.alternative.toolName}
                </a>
              ) : (
                <span className="font-semibold text-foreground">{step.alternative.toolName}</span>
              )}
              <PricingBadges pricing={step.alternative.pricing} pricingUrl={step.alternative.pricingUrl} />
            </p>
          )}

          {step.tips && step.tips.length > 0 && (
            <ul className="space-y-0.5">
              {step.tips.map((tip, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary" aria-hidden>•</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}

          {prompt && productId && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={prompt.onToggle}
                aria-pressed={prompt.open}
                className="min-h-11 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden />
                {prompt.open ? dict.workflow.hidePrompt : dict.workflow.writePrompt}
              </button>
              {prompt.open && (
                <PromptPanel
                  target={{ productId, toolName: step.primary.toolName }}
                  goal={stepGoal}
                  locale={prompt.locale}
                  cached={prompt.cache.get(cacheKey)}
                  onResult={(card) => prompt.cache.set(cacheKey, card)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}
