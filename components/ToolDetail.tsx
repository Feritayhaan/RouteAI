"use client"

// Bir aracın ayrıntı parçaları: rozetler, "güncel model" satırı, "neden" kutusu, düğmeler.
// Ana öneri kartı (SimpleRecommendationDisplay) ve açılır alternatifler (AlternativeTool)
// AYNI parçaları kullanır, böylece alternatife tıklayınca ana araçtakiyle aynı ayrıntı açılır.

import { useId, useState } from "react"
import { ChevronDown, ExternalLink, Wand2 } from "lucide-react"
import type { RecommendationTool } from "@/lib/types"
import { displayPriceLabel } from "@/lib/pricing"
import type { Dictionary } from "@/lib/i18n"
import { SOURCES } from "@/lib/catalog/sources"
import type { CurrentModel } from "@/lib/catalog/currentModel"
import { reasonsKind } from "@/lib/toolDetail"
import { promptProductId } from "@/lib/promptBuilder/products"
import PricingBadges from "./PricingBadges"
import VoteButtons from "./VoteButtons"
import { ConfidenceBadge, EditorPickBadge, EditorReasonsBox, ReasonsBox, UnverifiedBadge, UnverifiedNote } from "./Evidence"
import { onToolOpen } from "./toolOpen"

/** "Güncel model: X · Artificial Analysis · 26 Eyl 2026" — kaynak adı görünür (lisans şartı). */
export function CurrentModelLine({ model }: { model: CurrentModel }) {
  const source = SOURCES[model.source]
  const date = new Date(`${model.fetchedAt}T00:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
  return (
    <p className="text-[11px] md:text-xs text-muted-foreground">
      Güncel model: <span className="font-semibold text-foreground/90">{model.name}</span>
      {" · "}
      <a href={source.leaderboardUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{source.label}</a>
      {" · "}
      <span className="whitespace-nowrap">{date}</span>
    </p>
  )
}

/** Fiyat rozeti + güven (ya da "Editör seçimi" / "Doğrulanmadı") rozeti. */
export function ToolBadges({ tool, dict, unverified = false }: { tool: RecommendationTool; dict: Dictionary; unverified?: boolean }) {
  if (!tool.pricing && !tool.confidence) return null
  const kind = reasonsKind(tool, unverified)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tool.pricing && <PricingBadges pricing={tool.pricing} pricingUrl={tool.pricingUrl} />}
      {kind === "editor" ? (
        <EditorPickBadge dict={dict} />
      ) : kind === "unverified" ? (
        <UnverifiedBadge dict={dict} />
      ) : (
        tool.confidence && <ConfidenceBadge confidence={tool.confidence} dict={dict} />
      )}
    </div>
  )
}

/** "Neden" bölümü: editör gerekçesi, "doğrulanmadı" notu, RouteAI Skoru gerekçeleri ya da eski tek cümle. */
export function ToolReasons({ tool, dict, unverified = false }: { tool: RecommendationTool; dict: Dictionary; unverified?: boolean }) {
  switch (reasonsKind(tool, unverified)) {
    case "editor":
      return <EditorReasonsBox tool={tool} dict={dict} />
    case "unverified":
      return <UnverifiedNote dict={dict} />
    case "reasons":
      return <ReasonsBox tool={tool} dict={dict} />
    case "why":
      return (
        <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <span className="text-primary text-xs font-semibold">💡</span>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{tool.why}</p>
          </div>
        </div>
      )
    default:
      return null
  }
}

/** "Araca Git" (aracın sitesi) ve, rehberi varsa, "Prompt yaz". Siteyi açmak "işini gördü mü?" kaydını başlatır. */
export function ToolActions({
  tool,
  dict,
  taskId,
  onPrompt,
  className = "",
}: {
  tool: RecommendationTool
  dict: Dictionary
  taskId?: string
  onPrompt?: (toolName: string) => void
  className?: string
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onToolOpen(tool, taskId)}
        className="flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all shadow-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ExternalLink className="w-4 h-4" />
        <span>Araca Git</span>
      </a>
      {onPrompt && promptProductId(tool.toolName) && (
        <button
          type="button"
          onClick={() => onPrompt(tool.toolName)}
          className="flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wand2 className="w-4 h-4" aria-hidden />
          <span>{dict.prompt.forTool}</span>
        </button>
      )}
    </div>
  )
}

/**
 * Açılır alternatif: satır (ad, güven/"doğrulanmadı", fiyat, ok) tıklanınca siteye GİTMEZ, altında
 * ana araçtakiyle aynı ayrıntı açılır (rozetler, güncel model, açıklama, neden, "Araca Git", "Prompt yaz").
 * Oy düğmeleri satırın yanında kalır. `unverified`: "Diğer araçlar" listesi (araçta basis alanı olmayabilir).
 */
export function AlternativeTool({
  tool,
  dict,
  taskId,
  onPrompt,
  voteLabels,
  unverified = false,
}: {
  tool: RecommendationTool
  dict: Dictionary
  /** Oy ve tıklama kaydı için görev; yoksa (aranan ürün, tahmini eşleşme) yazılmaz. */
  taskId?: string
  onPrompt?: (toolName: string) => void
  voteLabels: { recommend: string; dontRecommend: string }
  unverified?: boolean
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const buttonId = `${id}-button`
  const panelId = `${id}-panel`
  const isUnverified = unverified || tool.basis === "unverified"

  return (
    <div className={`rounded-xl border transition-colors ${open ? "border-primary/30 bg-muted/30" : "border-border/60 hover:bg-muted/30"}`}>
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((v) => !v)}
          className="min-h-11 min-w-0 flex-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 break-words">
            <span className="font-medium">{tool.toolName}</span>
            {isUnverified ? (
              <span className="ml-2 text-[10px] text-muted-foreground">{dict.v3.unverified}</span>
            ) : (
              tool.confidence && <span className="ml-2 text-[10px] text-muted-foreground">{dict.rec.confidence[tool.confidence]}</span>
            )}
          </span>
          {/* `{price && ...}` YOK: 0 falsy oldugu halde React onu ekrana basiyor, fiyat yerine ciplak "0" cikiyordu. */}
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {displayPriceLabel(tool.pricing)}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
          </span>
        </button>
        {taskId && tool.productId && <VoteButtons taskId={taskId} productId={tool.productId} toolName={tool.toolName} labels={voteLabels} />}
      </div>

      {open && (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="space-y-3 px-3 pb-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <ToolBadges tool={tool} dict={dict} unverified={isUnverified} />
          {tool.currentModel && <CurrentModelLine model={tool.currentModel} />}
          <ToolActions tool={tool} dict={dict} taskId={taskId} onPrompt={onPrompt} />
          <p className="text-sm md:text-base leading-relaxed text-card-foreground">{tool.description}</p>
          <ToolReasons tool={tool} dict={dict} unverified={isUnverified} />
        </div>
      )}
    </div>
  )
}
