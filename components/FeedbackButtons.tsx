"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"

type Vote = "up" | "down"

/**
 * İki kullanım:
 *  - Klasik arayüz: { query, toolName } (eski alanlar, geriye uyumlu)
 *  - Sohbet: { sessionId, taskId, productId, toolName } — mesaj metni gönderilmez
 */
type Target =
  | { query: string; toolName: string; sessionId?: never; taskId?: never; productId?: never }
  | { query?: never; toolName: string; sessionId: string; taskId: string; productId: string }

interface Labels {
  question: string
  up: string
  down: string
  thanks: string
}

const DEFAULT_LABELS: Labels = {
  question: "Bu öneri işine yaradı mı?",
  up: "Öneri işime yaradı",
  down: "Öneri işime yaramadı",
  thanks: "Teşekkürler 🙏",
}

export default function FeedbackButtons(props: Target & { labels?: Labels; onVote?: (vote: Vote) => void }) {
  const [voted, setVoted] = useState<Vote | null>(null)
  const labels = props.labels ?? DEFAULT_LABELS

  const sendVote = (vote: Vote) => {
    if (voted) return
    setVoted(vote)
    props.onVote?.(vote)

    const body = props.query !== undefined
      ? { query: props.query, toolName: props.toolName, vote }
      : { sessionId: props.sessionId, taskId: props.taskId, productId: props.productId, toolName: props.toolName, vote }

    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch((error) => {
      console.error('Feedback gönderme hatası:', error)
    })
  }

  if (voted) {
    return (
      <div className="mt-4 border-t border-border/50 pt-3">
        <span className="text-xs text-primary animate-in fade-in" role="status">
          {labels.thanks}
        </span>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-border/50 pt-3 flex items-center gap-3">
      <span className="text-xs text-muted-foreground">{labels.question}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => sendVote("up")}
          aria-label={labels.up}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => sendVote("down")}
          aria-label={labels.down}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
