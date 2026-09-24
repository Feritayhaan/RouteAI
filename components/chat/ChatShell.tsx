"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { ArrowUp, Plus, Square } from "lucide-react"
import { getDictionary, type Locale } from "@/lib/i18n"
import { getSessionId } from "@/lib/chat/session"
import { localStore, sessionStore } from "@/lib/chat/storage"
import { dueOutcomePrompt, markOutcomeAsked, recordToolClick, type OutcomePrompt } from "@/lib/chat/outcomes"
import ThemeToggle from "@/components/ThemeToggle"
import { ChatContext, type ChatContextValue, type ToolOpen } from "./ChatContext"
import { useChat } from "./useChat"
import MessageBubble from "./MessageBubble"
import OutcomeCard from "./OutcomeCard"
import ComparisonCard from "./ComparisonCard"

export default function ChatShell({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale)
  const sessionId = useMemo(() => (typeof window === "undefined" ? "server-render" : getSessionId()), [])
  const { messages, busy, blocked, send, stop, retry, reset } = useChat({ locale, sessionId })
  const [input, setInput] = useState("")
  const [outcome, setOutcome] = useState<OutcomePrompt | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastPromptSession = useRef<string | undefined>(undefined)

  // İş sonucu sorusu: sonraki ziyarette hemen, sekmeye dönüşte ≥ 2 dk sonra.
  const checkOutcome = useCallback((requireAway: boolean) => {
    const due = dueOutcomePrompt(localStore(), sessionStore(), { now: Date.now(), requireAway })
    if (due) {
      markOutcomeAsked(localStore(), sessionStore(), due)
      setOutcome(due)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => checkOutcome(false), 0)
    const onVisible = () => {
      if (document.visibilityState === "visible") checkOutcome(true)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearTimeout(t)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [checkOutcome])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, outcome])

  const onToolOpen = useCallback((tool: ToolOpen) => {
    recordToolClick(localStore(), { ...tool, clickedAt: Date.now(), ...(lastPromptSession.current ? { promptSessionId: lastPromptSession.current } : {}) })
  }, [])

  const onPromptCopied = useCallback((promptSessionId: string) => {
    lastPromptSession.current = promptSessionId
  }, [])

  const ctx: ChatContextValue = useMemo(
    () => ({ locale, dict, sessionId, onToolOpen, onPromptCopied, send: (t: string) => void send(t), busy }),
    [locale, dict, sessionId, onToolOpen, onPromptCopied, send, busy]
  )

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || busy) return
    void send(input)
    setInput("")
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit()
  }

  const otherLocale: Locale = locale === "tr" ? "en" : "tr"

  return (
    <ChatContext.Provider value={ctx}>
      <Tooltip.Provider>
        <div className="flex min-h-dvh flex-col">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2">
              <a href={`/?lang=${locale}`} className="mr-auto rounded-lg text-lg font-black tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                RouteAI
              </a>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => { reset(); setOutcome(null); inputRef.current?.focus() }}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{dict.home.newChat}</span>
                  <span className="sr-only sm:hidden">{dict.home.newChat}</span>
                </button>
              )}
              <nav aria-label={dict.home.language}>
                <a
                  href={`/?lang=${otherLocale}`}
                  hrefLang={otherLocale}
                  lang={otherLocale}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-semibold uppercase hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {otherLocale}
                </a>
              </nav>
              <ThemeToggle inline labels={dict.theme} />
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
            {messages.length === 0 ? (
              <section className="flex flex-1 flex-col justify-center gap-6 py-10">
                <h1 className="text-2xl font-black leading-tight sm:text-3xl">{dict.home.tagline}</h1>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {dict.home.examples.map((ex) => (
                    <li key={ex}>
                      <button
                        type="button"
                        onClick={() => void send(ex)}
                        className="min-h-11 w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <div role="log" aria-label={dict.chat.assistant} className="flex flex-col gap-6 py-6">
                {messages.map((m, i) => (
                  <MessageBubble key={m.id} message={m} isLast={i === messages.length - 1} onRetry={() => retry(m.id)} />
                ))}
              </div>
            )}

            {outcome && (
              <div className="pb-6">
                {outcome.kind === "outcome" ? (
                  <OutcomeCard click={outcome.click} />
                ) : (
                  <ComparisonCard taskId={outcome.taskId} a={outcome.a} b={outcome.b} />
                )}
              </div>
            )}
            <div ref={endRef} />
          </main>

          <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/90 backdrop-blur">
            <form onSubmit={submit} className="mx-auto flex w-full max-w-3xl items-end gap-2 px-4 py-3">
              <label htmlFor="chat-input" className="sr-only">{dict.chat.inputLabel}</label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={2000}
                placeholder={dict.home.placeholder}
                className="max-h-40 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label={dict.home.stop}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Square className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || blocked}
                  aria-label={dict.home.send}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ArrowUp className="h-5 w-5" aria-hidden />
                </button>
              )}
            </form>
            <p className="mx-auto w-full max-w-3xl px-4 pb-2 text-center text-[11px] text-muted-foreground">
              <a href="/classic" className="underline underline-offset-2 hover:text-foreground">{dict.home.classic}</a>
            </p>
          </div>
        </div>
      </Tooltip.Provider>
    </ChatContext.Provider>
  )
}
