"use client"

import { useState } from "react"
import { ThumbsDown, ThumbsUp } from "lucide-react"
import { getSessionId } from "@/lib/chat/session"
import { trackEvent } from "@/lib/analytics/client"

type Vote = "up" | "down"

/**
 * Bir araç için kompakt 👍/👎 ("bu aracı öner / önerme"). Ana kartın alt satırındaki
 * FeedbackButtons'tan farkı: her önerilen araca (alternatif, diğer araçlar, iş akışı
 * adımı) küçük bir çift konabilir ve oy değiştirilebilir (sunucuda oturum + ürün +
 * görev başına son oy geçerli, aynı oy tekrarı sayacı oynatmaz).
 *
 * Puan ya da oy sayısı burada ASLA gösterilmez; kullanıcı sadece kendi oyunu görür.
 * Mesaj metni gönderilmez: sadece anonim oturum kimliği, görev ve ürün.
 */
export default function VoteButtons({
  taskId,
  productId,
  toolName,
  labels,
}: {
  taskId: string
  productId: string
  toolName: string
  labels: { recommend: string; dontRecommend: string }
}) {
  const [voted, setVoted] = useState<Vote | null>(null)

  const send = (vote: Vote) => {
    // Aynı butona tekrar basmak da gönderir: sunucu aynı oyu sayaca ikinci kez yazmaz (idempotent),
    // ama sayaçlar yönetici tarafından sıfırlandıysa oy yeniden girebilir. Analitik yalnızca ilk oyda sayılır.
    if (voted !== vote) trackEvent("feedback", { taskId })
    setVoted(vote)
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), taskId, productId, toolName, vote }),
    }).catch((error) => {
      console.error("Oy gönderme hatası:", error)
    })
  }

  const base =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" role="group" aria-label={toolName}>
      <button
        type="button"
        onClick={() => send("up")}
        aria-pressed={voted === "up"}
        aria-label={`${labels.recommend}: ${toolName}`}
        title={labels.recommend}
        className={`${base} ${voted === "up" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
      >
        <ThumbsUp className={`h-4 w-4 ${voted === "up" ? "fill-current" : ""}`} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => send("down")}
        aria-pressed={voted === "down"}
        aria-label={`${labels.dontRecommend}: ${toolName}`}
        title={labels.dontRecommend}
        className={`${base} ${voted === "down" ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"}`}
      >
        <ThumbsDown className={`h-4 w-4 ${voted === "down" ? "fill-current" : ""}`} aria-hidden />
      </button>
    </span>
  )
}
