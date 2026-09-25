"use client"

import { AlertCircle, Loader2 } from "lucide-react"
import type { Card } from "@/lib/agent/cards"
import { format } from "@/lib/i18n"
import type { ChatMessage } from "./useChat"
import { useChatContext } from "./ChatContext"
import RecommendationCard from "./RecommendationCard"
import QuestionCard from "./QuestionCard"
import PromptCard from "./PromptCard"
import PromptQuestionCard from "./PromptQuestionCard"
import WorkflowCard from "./WorkflowCard"

function CardView({ card, active }: { card: Card; active: boolean }) {
  switch (card.type) {
    case "recommendation":
      return <RecommendationCard card={card} />
    case "question":
      return <QuestionCard card={card} active={active} />
    case "prompt":
      return <PromptCard card={card} />
    case "prompt_question":
      return <PromptQuestionCard card={card} />
    case "workflow":
      return <WorkflowCard card={card} />
  }
}

/**
 * Tek mesaj. Asistan metni akarken aria-live="polite" ile okunur. `isLast`:
 * soru kartları sadece son mesajdayken cevaplanabilir.
 */
export default function MessageBubble({ message, isLast, onRetry }: { message: ChatMessage; isLast: boolean; onRetry: () => void }) {
  const { dict } = useChatContext()

  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <span className="sr-only">{dict.chat.you}: </span>
          {text}
        </div>
      </div>
    )
  }

  const streaming = message.status === "streaming"
  const empty = message.parts.length === 0
  return (
    <div className="flex flex-col gap-3" aria-busy={streaming}>
      <span className="sr-only">{dict.chat.assistant}:</span>
      {message.parts.map((part, i) =>
        part.type === "text" ? (
          <p key={i} className="whitespace-pre-wrap break-words text-sm leading-relaxed" aria-live={streaming ? "polite" : undefined}>
            {part.text}
          </p>
        ) : (
          <CardView key={i} card={part.card} active={isLast} />
        )
      )}
      {streaming && empty && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {dict.chat.thinking}
        </p>
      )}
      {message.status === "stopped" && <p className="text-xs text-muted-foreground">{dict.chat.stopped}</p>}
      {message.status === "rate_limited" && (
        <p role="alert" className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4" aria-hidden />
          {format(dict.chat.rateLimited, { seconds: message.retryAfter ?? 60 })}
        </p>
      )}
      {message.status === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <span>{dict.chat.error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-lg border border-border px-3 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.chat.retry}
          </button>
        </div>
      )}
    </div>
  )
}
