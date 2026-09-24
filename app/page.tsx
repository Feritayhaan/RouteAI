import type { Metadata } from "next"
import ChatShell from "@/components/chat/ChatShell"
import { getDictionary } from "@/lib/i18n"
import { currentLocale } from "@/lib/i18n/server"

type Props = { searchParams: Promise<{ lang?: string | string[] }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await currentLocale((await searchParams).lang)
  const dict = getDictionary(locale)
  return {
    title: { absolute: dict.meta.title },
    description: dict.meta.description,
    alternates: { canonical: `/?lang=${locale}`, languages: { en: "/?lang=en", tr: "/?lang=tr" } },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: "website",
      locale: dict.meta.ogLocale,
      siteName: "RouteAI",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    robots: { index: true, follow: true },
  }
}

export default async function Home({ searchParams }: Props) {
  const locale = await currentLocale((await searchParams).lang)
  return <ChatShell key={locale} locale={locale} />
}
