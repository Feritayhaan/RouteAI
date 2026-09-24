import type { Metadata } from "next"
import HomeClient from "@/components/HomeClient"

// v1 tek sorgu arayüzü (Türkçe). Sohbet arayüzü ana sayfada; bu sayfa
// silinmedi, arama motorlarına kapalı ve sitemap'te yok.
export const metadata: Metadata = {
  title: "Klasik arama",
  robots: { index: false, follow: false },
}

export default function ClassicPage() {
  return <HomeClient />
}
