"use client"

import { useState } from "react"
import { Workflow, ArrowRight } from "lucide-react"
import { WorkflowData } from "@/lib/types"
import WorkflowStepCard from "./WorkflowStepCard"
import CategoryBadge from "./CategoryBadge"

export default function WorkflowDisplay({ workflow }: { workflow: WorkflowData }) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]))

  const toggleStep = (order: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(order)) {
        next.delete(order)
      } else {
        next.add(order)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedSteps(new Set(workflow.steps.map(s => s.order)))
  }

  const collapseAll = () => {
    setExpandedSteps(new Set())
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="relative group">
        {/* Gradient Border */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 rounded-3xl blur-lg opacity-40 dark:opacity-30 group-hover:opacity-60 transition-opacity duration-500" />

        {/* Card Content */}
        <div className="relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl p-5 md:p-6 space-y-5 shadow-2xl">
          {/* Workflow Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Workflow</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {workflow.totalSteps} Adım
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    ⏱️ {workflow.estimatedDuration}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    {workflow.name}
                  </span>
                </h2>
                <div className="flex flex-wrap gap-1 mt-2">
                  {workflow.categories.map(cat => (
                    <CategoryBadge key={cat} category={cat} />
                  ))}
                </div>
              </div>
            </div>

            {/* Expand/Collapse Controls */}
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="text-[10px] px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
              >
                Tümünü Aç
              </button>
              <button
                onClick={collapseAll}
                className="text-[10px] px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
              >
                Tümünü Kapat
              </button>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-3">
            {workflow.steps.map((step, index) => (
              <div key={step.order} className="relative">
                <WorkflowStepCard
                  step={step}
                  isExpanded={expandedSteps.has(step.order)}
                  onToggle={() => toggleStep(step.order)}
                />
                {index < workflow.steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className="w-4 h-4 text-primary/50 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cost Calculator */}
          <div className="bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💰</span>
              <h3 className="text-sm font-bold">Tahmini Maliyet</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Budget Option */}
              <div className="bg-card/50 rounded-lg p-3 border border-border/30 hover:border-emerald-500/30 transition-colors">
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                  📦 Bütçe
                </div>
                <div className="text-lg font-black text-foreground">
                  $0
                  <span className="text-xs font-normal text-muted-foreground">/ay</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sadece ücretsiz araçlar
                </p>
              </div>

              {/* Recommended Option */}
              <div className="bg-primary/5 rounded-lg p-3 border-2 border-primary/30 relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full uppercase">
                  Önerilen
                </div>
                <div className="text-[10px] font-bold text-primary uppercase mb-1">
                  ⭐ Standart
                </div>
                <div className="text-lg font-black text-foreground">
                  ${Math.round(workflow.steps.reduce((acc, step) => {
                    const price = step.primary.pricing?.startingPrice || 0;
                    return acc + (step.primary.pricing?.free ? 0 : Math.min(price, 20));
                  }, 0))}
                  <span className="text-xs font-normal text-muted-foreground">/ay</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  En iyi değer/performans
                </p>
              </div>

              {/* Pro Option */}
              <div className="bg-card/50 rounded-lg p-3 border border-border/30 hover:border-blue-500/30 transition-colors">
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">
                  🚀 Profesyonel
                </div>
                <div className="text-lg font-black text-foreground">
                  ${Math.round(workflow.steps.reduce((acc, step) => {
                    const price = step.primary.pricing?.startingPrice || 20;
                    return acc + price;
                  }, 0))}
                  <span className="text-xs font-normal text-muted-foreground">/ay</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Tüm pro özellikler
                </p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              * Tahmini aylık maliyet. Gerçek fiyatlar değişebilir.
            </p>
          </div>

          {/* Workflow Summary */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              ✨ Bu workflow {workflow.totalSteps} adımda {workflow.categories.length} farklı AI kategorisi kullanıyor
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
