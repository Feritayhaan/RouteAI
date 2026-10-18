import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "next-themes"
import { getDictionary } from "@/lib/i18n"
import { currentLocale } from "@/lib/i18n/server"
import { currentDevice } from "@/lib/device/server"
import { serverSplit } from "@/lib/device/classify"
import { DeviceProvider } from "@/components/device/DeviceProvider"
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


// viewportFit: iPhone çentiği / alt çubuk için env(safe-area-inset-*) çalışsın.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

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
  // Cihaz: proxy.ts -> x-routeai-device (sunucu tahmini); DeviceProvider tarayıcıda düzeltir.
  const device = await currentDevice()
  return (
    <html lang={locale} data-device={device} data-split={String(serverSplit(device))} suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DeviceProvider initial={device}>{children}</DeviceProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
