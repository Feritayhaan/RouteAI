import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "next-themes"
import { getDictionary } from "@/lib/i18n"
import { currentLocale } from "@/lib/i18n/server"
import "./globals.css"

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
})
const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
})


// Dil: proxy.ts -> x-routeai-locale başlığı (?lang -> Accept-Language -> en).
export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await currentLocale())
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://www.routeai.chat"),
    title: {
      default: dict.meta.title,
      template: "%s | RouteAI",
    },
    description: dict.meta.description,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await currentLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
