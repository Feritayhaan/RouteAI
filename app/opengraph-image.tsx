// Paylaşım görseli (1200x630). Metin en.ts'teki meta'dan; sayı ya da iddia yok.

import { ImageResponse } from "next/og"
import { en } from "@/lib/i18n/en"

export const alt = en.meta.title
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0b0b0f",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -2 }}>RouteAI</div>
        <div style={{ marginTop: 24, fontSize: 40, lineHeight: 1.3, color: "#c4c4cc", maxWidth: 1000 }}>
          {en.home.tagline}
        </div>
      </div>
    ),
    size
  )
}
