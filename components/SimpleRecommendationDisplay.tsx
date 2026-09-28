"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, ExternalLink, Rocket } from "lucide-react"
import { SimpleRecommendation } from "@/lib/types"
import { displayPriceLabel } from "@/lib/pricing"
import { format, getDictionary } from "@/lib/i18n"
import PricingBadges from "./PricingBadges"
import CategoryBadge from "./CategoryBadge"
import FeedbackButtons from "./FeedbackButtons"
import { ConfidenceBadge, EditorPickBadge, EditorReasonsBox, ReasonsBox } from "./Evidence"
import { onToolOpen } from "./toolOpen"
import { trackEvent } from "@/lib/analytics/client"
import { getSessionId } from "@/lib/chat/session"
import { SOURCES } from "@/lib/catalog/sources"
import type { CurrentModel } from "@/lib/catalog/currentModel"

const dict = getDictionary("tr")

/** "Güncel model: X · Artificial Analysis · 26 Eyl 2026" — kaynak adı görünür (lisans şartı). */
function CurrentModelLine({ model }: { model: CurrentModel }) {
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

/** Sorgudaki fiyat koşulu tutmayınca gösterilen not (sunucu koşulu gevşetti). */
const RELAXED_NOTE: Record<string, string> = {
  free: "Bu iş için tamamen ücretsiz bir araç bulamadım; ücretsiz planı olan ya da ücretli seçenekleri gösteriyorum. Fiyatlar kartta.",
  paid: "Bu iş için sadece ücretli bir araç bulamadım; ücretsiz planı olan seçenekleri de gösteriyorum.",
  other: "Sorgundaki fiyat koşuluna tam uyan araç bulamadım; en yakın seçenekleri gösteriyorum.",
}

export default function SimpleRecommendationDisplay({
  recommendation,
  query,
}: {
  recommendation: SimpleRecommendation
  query: string
}) {
  const { main, taskId } = recommendation
  const editor = main.basis === "editor"
  // v3: oturum kimliği ile oy (arama metni gönderilmez); v1'de klasik oy.
  const [sessionId] = useState(() => (taskId && main.productId ? getSessionId() : null))

  useEffect(() => {
    if (taskId) trackEvent("recommendation_shown", { taskId })
  }, [taskId])
  const renderPricingBadges = () => {
    if (!main.pricing && !main.confidence) return null
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {main.pricing && <PricingBadges pricing={main.pricing} pricingUrl={main.pricingUrl} />}
        {editor ? <EditorPickBadge dict={dict} /> : main.confidence && <ConfidenceBadge confidence={main.confidence} dict={dict} />}
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 rounded-3xl blur-lg opacity-40 dark:opacity-30 group-hover:opacity-60 transition-opacity duration-500" />

        <div className="relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl p-4 md:p-6 lg:p-10 space-y-4 md:space-y-6 shadow-2xl">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4 pb-3 md:pb-4 border-b border-border/50">
            <div className="flex items-start gap-2 md:gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Rocket className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>

              <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                {/* Bu rozet SORGUNUN kategorisi, aracin degil: Beautiful.ai
                    veritabaninda 'metin' ama video sorgusunda "VIDEO" yaziyordu. */}
                {recommendation.taskLabel ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{dict.v3.task}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase break-words">
                      {recommendation.taskLabel}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Sorgu kategorisi</span>
                    <CategoryBadge category={recommendation.category} />
                  </div>
                )}
                {renderPricingBadges()}

                {recommendation.taskLabel && (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{dict.v3.pick}</p>
                )}
                <h2 className="text-xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight break-words">
                  <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    {main.toolName}
                  </span>
                </h2>
                {main.currentModel && <CurrentModelLine model={main.currentModel} />}
              </div>
            </div>

            <a
              href={main.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onToolOpen(main, taskId)}
              className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all shadow-lg text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Araca Git</span>
            </a>
          </div>

          <div className="space-y-3 md:space-y-4">
            {recommendation.relaxedPricing && (
              <p role="status" className="text-xs md:text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-300">
                {RELAXED_NOTE[recommendation.relaxedPricing] ?? RELAXED_NOTE.other}
              </p>
            )}
            {recommendation.relaxedConstraint && recommendation.relaxedConstraint.length > 0 && (
              <p role="status" className="flex items-start gap-2 text-xs md:text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {format(dict.rec.relaxed, {
                    constraints: recommendation.relaxedConstraint
                      .map((c) => (dict.rec.constraint as Record<string, string>)[c] ?? c)
                      .join(", "),
                  })}
                </span>
              </p>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                Ana öneri
              </div>
              <p className="text-sm md:text-base lg:text-lg leading-relaxed text-card-foreground">
                {main.description}
              </p>
              {editor ? (
                <EditorReasonsBox tool={main} dict={dict} />
              ) : main.reasons ? (
                <ReasonsBox tool={main} dict={dict} />
              ) : main.why && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-2">
                    <span className="text-primary text-xs font-semibold">💡</span>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {main.why}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {recommendation.alternatives && recommendation.alternatives.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                  Alternatif araçlar
                </div>
                <div className="flex flex-col gap-2">
                  {recommendation.alternatives.map((alt) => (
                    <a
                      key={alt.toolName}
                      href={alt.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onToolOpen(alt, taskId)}
                      className="text-sm flex justify-between items-center gap-3 hover:underline"
                    >
                      <span className="min-w-0 break-words">
                        {alt.toolName}
                        {alt.confidence && (
                          <span className="ml-2 text-[10px] text-muted-foreground no-underline">{dict.rec.confidence[alt.confidence]}</span>
                        )}
                      </span>
                      {/* `{price && ...}` YOK: 0 falsy oldugu halde React onu
                          ekrana basiyor, fiyat yerine ciplak "0" cikiyordu. */}
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {displayPriceLabel(alt.pricing)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {recommendation.unverified && recommendation.unverified.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                  {dict.v3.otherTools}
                </div>
                <div className="flex flex-col gap-2">
                  {recommendation.unverified.map((alt) => (
                    <a
                      key={alt.toolName}
                      href={alt.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onToolOpen(alt, taskId)}
                      className="text-sm flex justify-between items-center gap-3 hover:underline"
                    >
                      <span className="min-w-0 break-words">{alt.toolName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{displayPriceLabel(alt.pricing)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {sessionId && taskId && main.productId ? (
              <FeedbackButtons
                sessionId={sessionId}
                taskId={taskId}
                productId={main.productId}
                toolName={main.toolName}
                labels={{ question: dict.feedback.question, up: dict.feedback.up, down: dict.feedback.down, thanks: dict.feedback.thanks }}
                onVote={() => trackEvent("feedback", { taskId })}
              />
            ) : (
              <FeedbackButtons query={query} toolName={main.toolName} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
