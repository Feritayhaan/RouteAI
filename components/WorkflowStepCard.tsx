"use client"

import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import { WorkflowStep } from "@/lib/types"
import PricingBadges from "./PricingBadges"
import CopyButton from "./CopyButton"
import CategoryBadge from "./CategoryBadge"

interface StepLabels {
  recommended: string
  alternative: string
  open: string
  promptExample: string
  tips: string
}

const DEFAULT_LABELS: StepLabels = {
  recommended: "Önerilen",
  alternative: "Alternatif",
  open: "Git",
  promptExample: "Örnek Prompt",
  tips: "İpuçları",
}

export default function WorkflowStepCard({ step, isExpanded, onToggle, labels = DEFAULT_LABELS }: {
  step: WorkflowStep
  isExpanded: boolean
  onToggle: () => void
  labels?: StepLabels
}) {
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50 hover:border-primary/30 transition-all">
      {/* Step Header */}
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full min-h-11 flex items-center justify-between gap-2 p-4 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {step.order}
          </div>
          <div>
            <h4 className="font-semibold text-sm">{step.name}</h4>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step.category && <CategoryBadge category={step.category} />}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
          {/* Primary Tool */}
          <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-3 border border-primary/20">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary uppercase">🏆 {labels.recommended}</span>
                  <PricingBadges pricing={step.primary.pricing} />
                </div>
                <h5 className="font-bold text-base">{step.primary.toolName}</h5>
                <p className="text-xs text-muted-foreground">{step.primary.description}</p>
                {step.primary.why && (
                  <p className="text-xs text-primary/80 mt-1">
                    💡 {step.primary.why}
                  </p>
                )}
              </div>
              {step.primary.url && (
                <a
                  href={step.primary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 min-h-11 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  {labels.open}
                </a>
              )}
            </div>

            {/* Prompt Suggestion */}
            {step.primary.promptSuggestion && (
              <div className="mt-3 bg-muted/50 rounded-lg p-2.5 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{labels.promptExample}</span>
                  <CopyButton text={step.primary.promptSuggestion} />
                </div>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {step.primary.promptSuggestion}
                </p>
              </div>
            )}
          </div>

          {/* Alternative Tool */}
          {step.alternative && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">🔄 {labels.alternative}</span>
                  <PricingBadges pricing={step.alternative.pricing} />
                </div>
                <h5 className="font-semibold text-sm">{step.alternative.toolName}</h5>
                <p className="text-xs text-muted-foreground">{step.alternative.description}</p>
              </div>
              <a
                href={step.alternative.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          )}

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">💡 {labels.tips}</span>
              <ul className="mt-1 space-y-0.5">
                {step.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
