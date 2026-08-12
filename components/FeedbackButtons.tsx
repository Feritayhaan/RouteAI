"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"

type Vote = "up" | "down"

export default function FeedbackButtons({
  query,
  toolName
}: {
  query: string
  toolName: string
}) {
  const [voted, setVoted] = useState<Vote | null>(null)

  const sendVote = (vote: Vote) => {
    if (voted) return
    setVoted(vote)

    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, toolName, vote }),
    }).catch((error) => {
      console.error('Feedback gönderme hatası:', error)
    })
  }

  if (voted) {
    return (
      <div className="mt-4 border-t border-border/50 pt-3">
        <span className="text-xs text-primary animate-in fade-in">
          Teşekkürler 🙏
        </span>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-border/50 pt-3 flex items-center gap-3">
      <span className="text-xs text-muted-foreground">Bu öneri işine yaradı mı?</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => sendVote("up")}
          aria-label="Öneri işime yaradı"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 hover:scale-110"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => sendVote("down")}
          aria-label="Öneri işime yaramadı"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 hover:scale-110"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
