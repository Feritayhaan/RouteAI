import { Metadata } from "next"
import HomeClient from "@/components/HomeClient"

export const metadata: Metadata = {
  title: "RouteAI - Yapay Zeka Navigatörün",
  description: "Ne yapmak istediğini yaz, en uygun AI aracını veya adım adım iş akışını önerelim.",
  openGraph: {
    title: "RouteAI - Yapay Zeka Navigatörün",
    description: "Ne yapmak istediğini yaz, en uygun AI aracını veya adım adım iş akışını önerelim.",
    type: "website",
    locale: "tr_TR",
    siteName: "RouteAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "RouteAI - Yapay Zeka Navigatörün",
    description: "Ne yapmak istediğini yaz, en uygun AI aracını veya adım adım iş akışını önerelim.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Home() {
  return <HomeClient />
}
