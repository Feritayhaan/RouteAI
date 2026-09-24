import { notFound } from "next/navigation"
import type { Metadata } from "next"
import CardsPreview from "@/components/chat/CardsPreview"
import { currentLocale } from "@/lib/i18n/server"

// Sadece geliştirme: tüm kart tiplerini örnek veriyle gösterir (ekran
// görüntüsü ve elle test için). Üretimde 404.
export const metadata: Metadata = { title: "Dev: cards", robots: { index: false, follow: false } }

export default async function DevCardsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const locale = await currentLocale((await searchParams).lang)
  return <CardsPreview locale={locale} />
}
