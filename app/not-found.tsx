import Link from "next/link"
import { getDictionary } from "@/lib/i18n"
import { currentLocale } from "@/lib/i18n/server"

export default async function NotFound() {
  const locale = await currentLocale()
  const t = getDictionary(locale).errors
  return (
    <main className="glass-strong mx-auto my-10 flex w-full max-w-xl flex-col items-start justify-center gap-4 rounded-2xl px-6 py-10 md:px-8">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-black">{t.notFoundTitle}</h1>
      <p>{t.notFoundBody}</p>
      <Link
        href="/"
        className="glass-cta rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t.home}
      </Link>
    </main>
  )
}
