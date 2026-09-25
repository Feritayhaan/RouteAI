import type { Metadata } from "next"
import { currentLocale } from "@/lib/i18n/server"
import { format } from "@/lib/i18n"
import { PRIVACY, PRIVACY_UPDATED } from "@/lib/i18n/privacy"

type Props = { searchParams: Promise<{ lang?: string | string[] }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await currentLocale((await searchParams).lang)
  return { title: PRIVACY[locale].title, alternates: { languages: { en: "/privacy?lang=en", tr: "/privacy?lang=tr" } } }
}

export default async function PrivacyPage({ searchParams }: Props) {
  const locale = await currentLocale((await searchParams).lang)
  const t = PRIVACY[locale]
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
      <a href={`/?lang=${locale}`} className="text-sm underline underline-offset-2">{t.back}</a>
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p>{t.intro}</p>
      {t.sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="text-lg font-bold">{s.title}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {s.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ))}
      {email && <p className="text-sm">{format(t.contact, { email })}</p>}
      <p className="text-xs text-muted-foreground">{format(t.updated, { date: PRIVACY_UPDATED })}</p>
    </main>
  )
}
