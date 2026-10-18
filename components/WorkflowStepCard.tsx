"use client"

// İş akışında tek adım: kapalıyken tek satır ("1  Senaryo → ChatGPT"),
// açılınca ayrıntı (araç açıklaması, fiyat, link, alternatif, ipuçları) ve
// araç için prompt rehberi varsa "Bu adım için prompt yaz". Prompt, kullanıcının
// amacı + adım adıyla mevcut prompt oluşturucudan (PromptPanel) gelir.
// Yan yana düzende (geniş ekran) prompt kartın içinde değil, WorkflowDisplay'in
// sağ sütununda çizilir (placement: "side").

import { ArrowRight, ChevronDown, ExternalLink, Wand2 } from "lucide-react"
import type { PromptCard as PromptCardData, PromptQuestionCard as PromptQuestionData } from "@/lib/agent/cards"
import { format, type Dictionary, type Locale } from "@/lib/i18n"
import { promptProductId } from "@/lib/promptBuilder/products"
import type { WorkflowStep } from "@/lib/types"
import { UnverifiedBadge } from "./Evidence"
import PricingBadges from "./PricingBadges"
import PromptPanel from "./PromptPanel"
import VoteButtons from "./VoteButtons"
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
  /** "side": panel sağ sütunda (WorkflowDisplay), düğme sadece seçer. Varsayılan "inline". */
  placement?: "inline" | "side"
}

/** Adım promptunun ürünü, amacı ve önbellek anahtarı (kart içi ve yan panel aynı hesabı kullanır). */
export function stepPromptInput(step: WorkflowStep, goal: string, dict: Dictionary) {
  const productId = promptProductId(step.primary.toolName)
  return {
    productId,
    cacheKey: `${step.order}|${productId}`,
    goal: `${goal}\n\n${format(dict.workflow.stepGoal, { step: step.name, description: step.description })}`,
  }
}

export default function WorkflowStepCard({ step, isExpanded, onToggle, dict, prompt }: {
  step: WorkflowStep
  isExpanded: boolean
  onToggle: () => void
  dict: Dictionary
  /** Verilmezse prompt düğmesi gösterilmez. */
  prompt?: StepPrompt
}) {
  const input = prompt ? stepPromptInput(step, prompt.goal, dict) : null
  const productId = input?.productId ?? null
  const detailsId = `workflow-step-${step.order}`
  const voteLabels = { recommend: dict.feedback.recommend, dontRecommend: dict.feedback.dontRecommend }
  // Oy, aracın o adımda geldiği göreve verilir. Araç yerine durum yazılan adımlarda (productId yok) oy yok.
  const primaryTaskId = step.primary.taskId ?? step.taskId
  const alternativeTaskId = step.alternative?.taskId ?? step.taskId

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
              {step.primary.basis === "unverified" && <UnverifiedBadge dict={dict} />}
              {step.primary.description && (
                <p className="text-xs text-foreground/80">{step.primary.description}</p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {primaryTaskId && step.primary.productId && (
                <VoteButtons taskId={primaryTaskId} productId={step.primary.productId} toolName={step.primary.toolName} labels={voteLabels} />
              )}
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
              {step.alternative.basis === "unverified" && (
                <span className="rounded-full border border-slate-500/30 bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {dict.v3.unverified}
                </span>
              )}
              {alternativeTaskId && step.alternative.productId && (
                <VoteButtons taskId={alternativeTaskId} productId={step.alternative.productId} toolName={step.alternative.toolName} labels={voteLabels} />
              )}
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
              {prompt.open && prompt.placement !== "side" && input && (
                <PromptPanel
                  target={{ productId, toolName: step.primary.toolName }}
                  goal={input.goal}
                  locale={prompt.locale}
                  cached={prompt.cache.get(input.cacheKey)}
                  onResult={(card) => prompt.cache.set(input.cacheKey, card)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}
