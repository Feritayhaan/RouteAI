"use client"

import { AlertTriangle, ExternalLink, Info } from "lucide-react"
import type { RecommendationCard as Card, RecommendationItem } from "@/lib/agent/cards"
import { format, priceText, reasonText } from "@/lib/i18n"
import FeedbackButtons from "@/components/FeedbackButtons"
import ConfidenceBadge from "./ConfidenceBadge"
import { useChatContext } from "./ChatContext"

const pct = (x: number) => Math.round(x * 100)

function formatDate(date: string, locale: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return date
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(d)
}

function OpenLink({ item, taskId, primary }: { item: RecommendationItem; taskId: string | null; primary?: boolean }) {
  const { dict, onToolOpen } = useChatContext()
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => taskId && onToolOpen({ productId: item.productId, productName: item.name, taskId })}
      className={
        primary
          ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          : "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
    >
      <ExternalLink className="h-4 w-4" aria-hidden />
      {dict.rec.openTool}
      <span className="sr-only">: {item.name}</span>
    </a>
  )
}

function DataLine({ item }: { item: RecommendationItem }) {
  const { dict, locale } = useChatContext()
  const sources = item.sources.length > 0 ? (
    <>
      {item.sources.map((s, i) => (
        <span key={s.id}>
          {i > 0 && ", "}
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {s.label}
            </a>
          ) : s.id === "routeai-users" ? (
            dict.rec.sourceUsers
          ) : s.id === "routeai-expert" ? (
            dict.rec.sourceExpert
          ) : (
            s.label
          )}
        </span>
      ))}
    </>
  ) : (
    dict.rec.noSources
  )
  const [before, after] = (item.dataDate ? dict.rec.data : dict.rec.dataNoDate).split("{sources}")
  return (
    <p className="text-xs text-muted-foreground">
      {format(before, { date: item.dataDate ? formatDate(item.dataDate, locale) : "" })}
      {sources}
      {after}
    </p>
  )
}

function ShareBar({ item }: { item: RecommendationItem }) {
  const { dict } = useChatContext()
  if (!item.shares) return null
  const users = pct(item.shares.users)
  const expert = pct(item.shares.expert)
  const benchmark = pct(item.shares.benchmark)
  const text = expert > 0
    ? format(dict.rec.shareExpert, { users, expert, benchmark })
    : format(dict.rec.share, { users: users + expert, benchmark })
  return (
    <div className="space-y-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="bg-emerald-500" style={{ width: `${users}%` }} />
        <div className="bg-sky-500" style={{ width: `${expert}%` }} />
        <div className="bg-slate-400" style={{ width: `${benchmark}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

export default function RecommendationCard({ card }: { card: Card }) {
  const { dict, sessionId } = useChatContext()

  if (card.noEvidence || card.items.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p>{dict.rec.noEvidence}</p>
      </div>
    )
  }

  const [main, ...alternatives] = card.items
  const reasons = main.reasons.map((r) => reasonText(dict, r)).filter((t): t is string => t !== null).slice(0, 4)
  const fallback = card.mode === "fallback"

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {card.relaxedConstraint && card.relaxedConstraint.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            {format(dict.rec.relaxed, {
              constraints: card.relaxedConstraint
                .map((c) => (dict.rec.constraint as Record<string, string>)[c] ?? c)
                .join(", "),
            })}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{dict.rec.best}</p>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-black leading-tight">{main.name}</h3>
          {main.confidence && <ConfidenceBadge confidence={main.confidence} />}
        </div>
        <p className="text-sm font-medium">{priceText(dict, main.pricing)}</p>
        {fallback && <p className="text-xs text-muted-foreground">{dict.rec.fallback}</p>}
        {reasons.length > 0 && (
          <div>
            <p className="sr-only">{dict.rec.why}</p>
            <ul className="space-y-1 text-sm">
              {reasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-primary" aria-hidden>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!fallback && <ShareBar item={main} />}
        {!fallback && <DataLine item={main} />}
        <OpenLink item={main} taskId={card.taskId} primary />
      </div>

      {alternatives.length > 0 && (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{dict.rec.alternatives}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {alternatives.slice(0, 2).map((alt) => (
              <li key={alt.productId} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{alt.name}</span>
                  {alt.confidence && <ConfidenceBadge confidence={alt.confidence} />}
                </div>
                <span className="text-xs text-muted-foreground">{priceText(dict, alt.pricing)}</span>
                <OpenLink item={alt} taskId={card.taskId} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.taskId && (
        <FeedbackButtons
          sessionId={sessionId}
          taskId={card.taskId}
          productId={main.productId}
          toolName={main.name}
          labels={{ question: dict.feedback.question, up: dict.feedback.up, down: dict.feedback.down, thanks: dict.feedback.thanks }}
        />
      )}
    </div>
  )
}
