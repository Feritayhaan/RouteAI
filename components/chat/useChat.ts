"use client"

// /api/chat akışını okuyan sohbet durumu. Geçmiş sadece bellekte (hesap yok).

import { useCallback, useRef, useState } from "react"
import type { ChatEvent } from "@/lib/agent/cards"
import { createNdjsonParser } from "@/lib/chat/ndjson"
import { toApiMessages, type UIMessage } from "@/lib/chat/history"
import type { Locale } from "@/lib/i18n"

export type AssistantStatus = "streaming" | "done" | "error" | "stopped" | "rate_limited"

export interface ChatMessage extends UIMessage {
  status?: AssistantStatus
  /** rate_limited ise saniye. */
  retryAfter?: number
  fallback?: boolean
}

let counter = 0
const newId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`

export function useChat({ locale, sessionId }: { locale: Locale; sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  /** 429 sonrası bekleme süresince gönderim kapalı. */
  const [blocked, setBlocked] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  messagesRef.current = messages

  const update = useCallback((id: string, fn: (m: ChatMessage) => ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)))
  }, [])

  const apply = useCallback((id: string, e: ChatEvent) => {
    update(id, (m) => {
      switch (e.type) {
        case "text": {
          const parts = [...m.parts]
          const last = parts.at(-1)
          if (last?.type === "text") parts[parts.length - 1] = { type: "text", text: last.text + e.delta }
          else parts.push({ type: "text", text: e.delta })
          return { ...m, parts }
        }
        case "card":
          return { ...m, parts: [...m.parts, { type: "card", card: e.card }] }
        case "done":
          return { ...m, status: m.status === "streaming" ? "done" : m.status, fallback: e.fallback }
        case "error":
          return { ...m, status: "error" }
      }
    })
  }, [update])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy || blocked) return

    const user: ChatMessage = { id: newId(), role: "user", parts: [{ type: "text", text: trimmed }] }
    const assistant: ChatMessage = { id: newId(), role: "assistant", parts: [], status: "streaming" }
    const history = [...messagesRef.current.filter((m) => m.status !== "error" && m.status !== "rate_limited"), user]
    setMessages((prev) => [...prev, user, assistant])
    setBusy(true)

    const abort = new AbortController()
    abortRef.current = abort
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toApiMessages(history), locale, sessionId }),
        signal: abort.signal,
      })
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        const retryAfter = Number(body?.retryAfter) || 60
        setBlocked(true)
        setTimeout(() => setBlocked(false), retryAfter * 1000)
        update(assistant.id, (m) => ({ ...m, status: "rate_limited", retryAfter }))
        return
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const parser = createNdjsonParser((e) => apply(assistant.id, e))
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        parser.push(decoder.decode(value, { stream: true }))
      }
      parser.flush()
      update(assistant.id, (m) => (m.status === "streaming" ? { ...m, status: "done" } : m))
    } catch {
      update(assistant.id, (m) => ({ ...m, status: abort.signal.aborted ? "stopped" : "error" }))
    } finally {
      abortRef.current = null
      setBusy(false)
    }
  }, [apply, blocked, busy, locale, sessionId, update])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  /** Hatalı cevabı ve onu doğuran kullanıcı mesajını kaldırıp yeniden gönderir. */
  const retry = useCallback((assistantId: string) => {
    const list = messagesRef.current
    const i = list.findIndex((m) => m.id === assistantId)
    const userMsg = list[i - 1]
    if (i < 1 || userMsg?.role !== "user") return
    const text = userMsg.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
    setMessages(list.slice(0, i - 1))
    messagesRef.current = list.slice(0, i - 1)
    void send(text)
  }, [send])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
  }, [])

  return { messages, busy, blocked, send, stop, retry, reset }
}
