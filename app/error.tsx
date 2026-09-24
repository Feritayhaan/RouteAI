"use client"

// Sayfa düzeyi hata sınırı. Dil <html lang>'den okunur (layout proxy başlığıyla yazar).
// Hata ayrıntısı kullanıcıya gösterilmez; sadece digest (varsa) loglanır.

import { useEffect, useSyncExternalStore } from "react"
import { getDictionary, isLocale, type Locale } from "@/lib/i18n"

const noopSubscribe = () => () => {}
const htmlLocale = (): Locale => {
  const lang = document.documentElement.lang
  return isLocale(lang) ? lang : "en"
}

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useSyncExternalStore(noopSubscribe, htmlLocale, () => "en" as Locale)
  useEffect(() => {
    if (error.digest) console.error("[error]", error.digest)
  }, [error])
  const t = getDictionary(locale).errors
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-start justify-center gap-4 px-4 py-10">
      <p className="font-mono text-sm text-muted-foreground">500</p>
      <h1 className="text-3xl font-black">{t.errorTitle}</h1>
      <p>{t.errorBody}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.retry}
        </button>
        <a
          href={`/?lang=${locale}`}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.home}
        </a>
      </div>
    </main>
  )
}
