"use client"

import * as Tooltip from "@radix-ui/react-tooltip"
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react"
import { useChatContext } from "./ChatContext"

type Confidence = "high" | "medium" | "low"

const STYLE: Record<Confidence, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
}
const ICON = { high: ShieldCheck, medium: ShieldAlert, low: ShieldQuestion }

/** Güven rozeti; koşul tooltip'te ve ekran okuyucu için görünmez metinde. */
export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { dict } = useChatContext()
  const Icon = ICON[confidence]
  return (
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
  )
}
