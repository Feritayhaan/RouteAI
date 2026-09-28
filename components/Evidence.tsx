"use client"

// v3 kartının kanıt parçaları: güven rozeti, "neden" satırları ve veri satırı
// (tarih + kaynak adı). components/chat/RecommendationCard.tsx ve
// ConfidenceBadge.tsx'ten uyarlandı; onlar ChatContext'e bağlı olduğu için
// burada sözlük prop olarak gelir. Kaynaksız ifade yok: her satır bir gerekçe
// kodundan (lib/catalog/score.ts) ya da katalog verisinden gelir.

import * as Tooltip from "@radix-ui/react-tooltip"
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react"
import { format, reasonText, type Dictionary } from "@/lib/i18n"
import { SOURCES } from "@/lib/catalog/sources"
import type { Confidence, RecommendationTool } from "@/lib/types"

const STYLE: Record<Confidence, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
}
const ICON = { high: ShieldCheck, medium: ShieldAlert, low: ShieldQuestion }

/** Güven rozeti; koşul tooltip'te ve ekran okuyucu için görünmez metinde. */
export function ConfidenceBadge({ confidence, dict }: { confidence: Confidence; dict: Dictionary }) {
  const Icon = ICON[confidence]
  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={150}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${STYLE[confidence]}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {dict.rec.confidence[confidence]}
            <span className="sr-only">. {dict.rec.confidenceHint[confidence]}</span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-64 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
          >
            {dict.rec.confidenceHint[confidence]}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

/** Önce kendi kanıtımız ve benchmark sırası (P13: uzman puanı, kullanıcı sonuçları, benchmark sırası), sonra diğerleri. */
const REASON_ORDER = ["expert_rubric", "outcome_success", "comparison_wins", "users_like", "benchmark_rank"]
const USER_REASONS = new Set(["outcome_success", "comparison_wins", "users_like"])

function rank(code: string): number {
  const i = REASON_ORDER.indexOf(code)
  return i === -1 ? REASON_ORDER.length : i
}

function formatDate(date: string, locale: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return date
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(d)
}

/** "Veri: 28 Eyl 2026 · LMArena, RouteAI uzman değerlendirmesi" — benchmark kaynakları linkli. */
export function DataLine({ tool, dict, locale = "tr" }: { tool: RecommendationTool; dict: Dictionary; locale?: string }) {
  const codes = new Set((tool.reasons ?? []).map((r) => r.code))
  const own: string[] = []
  if (codes.has("expert_rubric")) own.push(dict.rec.sourceExpert)
  if ([...codes].some((c) => USER_REASONS.has(c))) own.push(dict.rec.sourceUsers)
  const benchmarks = (tool.sources ?? []).filter((s) => SOURCES[s])

  const parts = [
    ...benchmarks.map((s) => (
      <a key={s} href={SOURCES[s].leaderboardUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
        {SOURCES[s].label}
      </a>
    )),
    ...own.map((label) => <span key={label}>{label}</span>),
  ]
  const sources = parts.length > 0
    ? parts.map((p, i) => <span key={i}>{i > 0 && ", "}{p}</span>)
    : dict.rec.noSources
  const [before, after] = (tool.dataDate ? dict.rec.data : dict.rec.dataNoDate).split("{sources}")
  return (
    <p className="text-[11px] md:text-xs text-muted-foreground">
      {format(before, { date: tool.dataDate ? formatDate(tool.dataDate, locale) : "" })}
      {sources}
      {after}
    </p>
  )
}

/** "Neden" kutusu: gerekçe kodları metne (reasonText) + veri satırı. */
export function ReasonsBox({ tool, dict, locale = "tr" }: { tool: RecommendationTool; dict: Dictionary; locale?: string }) {
  const reasons = [...(tool.reasons ?? [])]
    .sort((a, b) => rank(a.code) - rank(b.code))
    .map((r) => reasonText(dict, r))
    .filter((t): t is string => t !== null)
    .slice(0, 4)

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-semibold text-primary">{dict.rec.why}</p>
      {reasons.length > 0 && (
        <ul className="space-y-1 text-xs md:text-sm text-muted-foreground">
          {reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-primary" aria-hidden>•</span>
              <span className="min-w-0 break-words">{r}</span>
            </li>
          ))}
        </ul>
      )}
      <DataLine tool={tool} dict={dict} locale={locale} />
    </div>
  )
}

/** "Editör seçimi" rozeti: kanıt yokken öne çıkarılan araç; puan iddiası yok. */
export function EditorPickBadge({ dict }: { dict: Dictionary }) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={150}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {dict.v3.editorPick}
            <span className="sr-only">. {dict.v3.editorPickHint}</span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-64 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
          >
            {dict.v3.editorPickHint}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

/** Editör seçiminin "Neden" kutusu: tarafsız gerekçe + henüz veri olmadığı + tarih. */
export function EditorReasonsBox({ tool, dict, locale = "tr" }: { tool: RecommendationTool; dict: Dictionary; locale?: string }) {
  const [before, after] = (tool.dataDate ? dict.rec.data : dict.rec.dataNoDate).split("{sources}")
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-semibold text-primary">{dict.rec.why}</p>
      <ul className="space-y-1 text-xs md:text-sm text-muted-foreground">
        {tool.editorNote && (
          <li className="flex gap-2">
            <span className="text-primary" aria-hidden>•</span>
            <span className="min-w-0 break-words">{tool.editorNote}</span>
          </li>
        )}
        <li className="flex gap-2">
          <span className="text-primary" aria-hidden>•</span>
          <span className="min-w-0 break-words">{dict.v3.editorNoData}</span>
        </li>
      </ul>
      <p className="text-[11px] md:text-xs text-muted-foreground">
        {format(before, { date: tool.dataDate ? formatDate(tool.dataDate, locale) : "" })}
        {dict.rec.sourceEditor}
        {after}
      </p>
    </div>
  )
}
