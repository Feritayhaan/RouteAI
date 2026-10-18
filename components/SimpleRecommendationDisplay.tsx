"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, ExternalLink, Rocket, Wand2 } from "lucide-react"
import { SimpleRecommendation } from "@/lib/types"
import { displayPriceLabel } from "@/lib/pricing"
import { format, getDictionary } from "@/lib/i18n"
import PricingBadges from "./PricingBadges"
import CategoryBadge from "./CategoryBadge"
import FeedbackButtons from "./FeedbackButtons"
import { ConfidenceBadge, EditorPickBadge, EditorReasonsBox, ReasonsBox, UnverifiedBadge, UnverifiedNote } from "./Evidence"
import VoteButtons from "./VoteButtons"
import { onToolOpen } from "./toolOpen"
import { trackEvent } from "@/lib/analytics/client"
import { getSessionId } from "@/lib/chat/session"
import { SOURCES } from "@/lib/catalog/sources"
import { promptProductId } from "@/lib/promptBuilder/products"
import type { CurrentModel } from "@/lib/catalog/currentModel"

const dict = getDictionary("tr")
const VOTE_LABELS = { recommend: dict.feedback.recommend, dontRecommend: dict.feedback.dontRecommend }

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
  onPrompt,
  onSelectTask,
  beside = false,
}: {
  recommendation: SimpleRecommendation
  query: string
  /** "Prompt yaz": ana araç için prompt kutusunu açar (HomeClient). */
  onPrompt?: (toolName: string) => void
  /** Tahmini eşleşmede "başka bir iş mi demek istedin?" düğmesi: aynı sorgu seçilen işle yeniden aranır (HomeClient). */
  onSelectTask?: (taskId: string) => void
  /** Prompt paneli yanında (geniş ekranda yarım sütun): başlık ve düğmeler alt alta, yazı bir kademe küçük. */
  beside?: boolean
}) {
  const { main, taskId } = recommendation
  const editor = main.basis === "editor"
  const unverifiedMain = main.basis === "unverified"
  // Kullanıcı bir ürünün ADINI yazdıysa görevi biz seçtik, kullanıcının niyeti o görev değil:
  // o göreve oy, "işini gördü mü?" kaydı ve görev olayı yazılmaz (sıralama verisi kirlenmesin).
  const searched = recommendation.searched === true
  // Tahmini eşleşmede de aynı: kullanıcının isteği bu iş değil (en yakın iş), o işe oy ya da olay yazılmaz.
  const approximate = recommendation.approximate
  const signalTaskId = searched || approximate ? undefined : taskId
  // v3: oturum kimliği ile oy (arama metni gönderilmez); v1'de klasik oy.
  const [sessionId] = useState(() => (signalTaskId && main.productId ? getSessionId() : null))

  useEffect(() => {
    if (signalTaskId) trackEvent("recommendation_shown", { taskId: signalTaskId })
  }, [signalTaskId])
  const renderPricingBadges = () => {
    if (!main.pricing && !main.confidence) return null
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {main.pricing && <PricingBadges pricing={main.pricing} pricingUrl={main.pricingUrl} />}
        {editor ? (
          <EditorPickBadge dict={dict} />
        ) : unverifiedMain ? (
          <UnverifiedBadge dict={dict} />
        ) : (
          main.confidence && <ConfidenceBadge confidence={main.confidence} dict={dict} />
        )}
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 motion-reduce:animate-none">
      <div className="relative group">
        {/* Kart arkası parıltı: mobilde yok (blur kaydırmayı ağırlaştırır) */}
        <div className="mobile:hidden absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/60 to-primary/40 rounded-3xl blur-lg opacity-40 dark:opacity-30 group-hover:opacity-60 transition-opacity duration-500" />

        <div className={`relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl p-4 md:p-6 ${beside ? "" : "lg:p-10"} space-y-4 md:space-y-6 shadow-2xl mobile:shadow-lg`}>
          {/* Card Header */}
          <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4 pb-3 md:pb-4 border-b border-border/50 ${beside ? "lg:flex-col" : ""}`}>
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
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                    {recommendation.searched ? dict.v3.searched : approximate ? dict.v3.approxPick : dict.v3.pick}
                  </p>
                )}
                <h2 className={`text-xl md:text-3xl ${beside ? "" : "lg:text-4xl"} font-black tracking-tight leading-tight break-words`}>
                  <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    {main.toolName}
                  </span>
                </h2>
                {main.currentModel && <CurrentModelLine model={main.currentModel} />}
              </div>
            </div>

            <div className="self-start flex flex-wrap gap-2">
              <a
                href={main.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onToolOpen(main, signalTaskId)}
                className="flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all shadow-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Araca Git</span>
              </a>
              {onPrompt && promptProductId(main.toolName) && (
                <button
                  type="button"
                  onClick={() => onPrompt(main.toolName)}
                  className="flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Wand2 className="w-4 h-4" aria-hidden />
                  <span>{dict.prompt.forTool}</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 md:space-y-4">
            {approximate && (
              // Hata gibi durmaz (uyarı rengi/ikonu yok): tek satır not + "başka iş" düğmeleri. Tahmini olduğu rozet ve notta yine görünür.
              <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs md:text-sm text-muted-foreground">
                <span>{format(dict.v3.approxNote, { task: recommendation.taskLabel ?? "" })}</span>
                {approximate.otherTasks.length > 0 && onSelectTask && (
                  <>
                    <span className="font-semibold text-foreground/80">{dict.v3.approxOther}</span>
                    {approximate.otherTasks.map((t) => (
                      <button
                        key={t.taskId}
                        type="button"
                        onClick={() => onSelectTask(t.taskId)}
                        className="min-h-9 rounded-lg border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-foreground break-words hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
            {recommendation.searched && (
              <p role="status" className="text-xs md:text-sm rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-muted-foreground">
                {dict.v3.searchedNote}
              </p>
            )}
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
              ) : unverifiedMain ? (
                <UnverifiedNote dict={dict} />
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
                    <div key={alt.toolName} className="flex items-center gap-2">
                      <a
                        href={alt.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onToolOpen(alt, signalTaskId)}
                        className="min-w-0 flex-1 min-h-11 touch:py-1 text-sm flex justify-between items-center gap-3 hover:underline"
                      >
                        <span className="min-w-0 break-words">
                          {alt.toolName}
                          {alt.basis === "unverified" ? (
                            <span className="ml-2 text-[10px] text-muted-foreground no-underline">{dict.v3.unverified}</span>
                          ) : (
                            alt.confidence && (
                              <span className="ml-2 text-[10px] text-muted-foreground no-underline">{dict.rec.confidence[alt.confidence]}</span>
                            )
                          )}
                        </span>
                        {/* `{price && ...}` YOK: 0 falsy oldugu halde React onu
                            ekrana basiyor, fiyat yerine ciplak "0" cikiyordu. */}
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {displayPriceLabel(alt.pricing)}
                        </span>
                      </a>
                      {signalTaskId && alt.productId && (
                        <VoteButtons taskId={signalTaskId} productId={alt.productId} toolName={alt.toolName} labels={VOTE_LABELS} />
                      )}
                    </div>
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
                    <div key={alt.toolName} className="flex items-center gap-2">
                      <a
                        href={alt.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onToolOpen(alt, signalTaskId)}
                        className="min-w-0 flex-1 min-h-11 touch:py-1 text-sm flex justify-between items-center gap-3 hover:underline"
                      >
                        <span className="min-w-0 break-words">{alt.toolName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{displayPriceLabel(alt.pricing)}</span>
                      </a>
                      {signalTaskId && alt.productId && (
                        <VoteButtons taskId={signalTaskId} productId={alt.productId} toolName={alt.toolName} labels={VOTE_LABELS} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searched || approximate ? null : sessionId && taskId && main.productId ? (
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
