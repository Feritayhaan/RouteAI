"use client"

import { useState, type ReactNode } from "react"
import { Check, Copy, ExternalLink } from "lucide-react"
import type { PromptCard as Card } from "@/lib/agent/cards"
import { format } from "@/lib/i18n"
import { useChatContext } from "./ChatContext"

export function CopyPromptButton({ text, onCopied }: { text: string; onCopied?: () => void }) {
  const { dict } = useChatContext()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // pano izni yok: sessiz geç
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span role="status">{copied ? dict.prompt.copied : dict.prompt.copy}</span>
    </button>
  )
}

/**
 * Prompt kartı. P6'da tek varyant + örnek veri; P7 varyant sekmeleri,
 * varsayımlar, iyileştirme butonları ve versiyon geçmişini `children` ve
 * `header` ile genişletir.
 */
export default function PromptCard({
  card,
  header,
  children,
  onCopied,
  mock = false,
}: {
  card: Card
  header?: ReactNode
  children?: ReactNode
  onCopied?: () => void
  mock?: boolean
}) {
  const { dict } = useChatContext()
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold">{format(dict.prompt.title, { product: card.productName })}</h3>
        {card.draft && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            {dict.prompt.draft}
          </span>
        )}
      </div>
      {mock && <p className="text-xs text-muted-foreground">{dict.prompt.mock}</p>}
      {header}
      <div className="space-y-2">
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 font-mono text-sm leading-relaxed">{card.prompt}</pre>
        <div className="flex flex-wrap gap-2">
          <CopyPromptButton text={card.prompt} onCopied={onCopied} />
          {card.productUrl && (
            <a
              href={card.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              {dict.rec.openTool}
            </a>
          )}
        </div>
      </div>
      {card.settings.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">{dict.prompt.settings}</p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {card.settings.map((s) => (
              <div key={s.key} className="contents">
                <dt className="text-muted-foreground">{s.key}</dt>
                <dd className="break-words font-mono">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {card.howToUse.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">{dict.prompt.howToUse}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            {card.howToUse.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {children}
    </div>
  )
}
