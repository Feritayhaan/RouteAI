import { getDictionary } from "@/lib/i18n"
import { currentLocale } from "@/lib/i18n/server"

export default async function NotFound() {
  const locale = await currentLocale()
  const t = getDictionary(locale).errors
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-start justify-center gap-4 px-4 py-10">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-black">{t.notFoundTitle}</h1>
      <p>{t.notFoundBody}</p>
      <a
        href={`/?lang=${locale}`}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t.home}
      </a>
    </main>
  )
}
