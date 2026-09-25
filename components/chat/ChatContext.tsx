"use client"

import { createContext, useContext } from "react"
import type { Dictionary, Locale } from "@/lib/i18n"

export interface ToolOpen {
  productId: string
  productName: string
  taskId: string
}

export interface CopiedPrompt {
  promptSessionId: string
  guideId: string
  guideVersion: number
}

export interface ChatContextValue {
  locale: Locale
  dict: Dictionary
  sessionId: string
  /** Kullanıcı bir aracı açtı: iş sonucu sorusu için kaydedilir. */
  onToolOpen: (tool: ToolOpen) => void
  /** Prompt kopyalandı: iş sonucu kaydı bu prompt oturumuna ve rehber sürümüne bağlanır. */
  onPromptCopied: (copied: CopiedPrompt) => void
  /** Kart içinden kullanıcı mesajı gönderir (soru kartı cevabı). */
  send: (text: string) => void
  busy: boolean
}

export const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("ChatContext yok")
  return ctx
}
