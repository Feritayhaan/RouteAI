"use client"

// v3: görev bulundu ama kanıtlı ürün yok. Dürüst boş durum: araç tahmin
// edilmez, puan ya da sıralama iddiası yok. Görevdeki aktif araçlar alfabetik,
// "Doğrulanmadı" etiketiyle.

import { ExternalLink, Info } from "lucide-react"
import { priceText, type Dictionary } from "@/lib/i18n"
import { getPricingModel, isPriceVerified } from "@/lib/pricing"
import type { NoEvidenceRecommendation } from "@/lib/types"
import { onToolOpen } from "./toolOpen"

export default function NoEvidenceDisplay({ result, dict }: { result: NoEvidenceRecommendation; dict: Dictionary }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700" aria-labelledby="no-evidence-title">
      <div className="glass-strong relative rounded-2xl p-4 md:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-muted border border-border flex items-center justify-center">
            <Info className="w-5 h-5 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{dict.v3.task}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase break-words">
                {result.taskLabel}
              </span>
            </div>
            <h2 id="no-evidence-title" className="text-lg md:text-xl font-black tracking-tight leading-tight">{dict.v3.noEvidenceTitle}</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {result.products.length > 0 ? dict.v3.noEvidenceBody : dict.v3.noTools}
            </p>
          </div>
        </div>

        {result.products.length > 0 && (
          <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
            {result.products.map((p) => (
              <li key={p.productId ?? p.toolName} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-sm break-words">{p.toolName}</span>
                    <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                      {dict.v3.unverified}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getPricingModel(p.pricing) === "free" || isPriceVerified(p.pricing) ? priceText(dict, p.pricing) : dict.price.unverified}
                  </p>
                </div>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onToolOpen(p, result.taskId)}
                    className="shrink-0 min-h-11 inline-flex items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                    {dict.workflow.open}
                    <span className="sr-only">: {p.toolName}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
