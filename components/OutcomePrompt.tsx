"use client"

// "İşini gördü mü?" — RouteAI Skoru'nun ana veri kaynağı (P15).
// Kullanıcı bir aracı açıp sekmeye ≥ 2 dk sonra döndüğünde ya da sonraki
// ziyaretinde sorulur (lib/chat/outcomes: kural ve süreler). Aynı görevde iki
// farklı ürün açıldıysa "hangisi daha iyiydi?". Oturum başına en fazla bir
// soru. Kartlar sohbetteki OutcomeCard/ComparisonCard'ın aynısı.

import { useEffect, useState } from "react"
import { getDictionary } from "@/lib/i18n"
import { dueOutcomePrompt, markOutcomeAsked, type OutcomePrompt as Prompt } from "@/lib/chat/outcomes"
import { getSessionId } from "@/lib/chat/session"
import { localStore, sessionStore } from "@/lib/chat/storage"
import { ChatContext, type ChatContextValue } from "./chat/ChatContext"
import OutcomeCard from "./chat/OutcomeCard"
import ComparisonCard from "./chat/ComparisonCard"

const dict = getDictionary("tr")
const noop = () => {}
/** Eski sürümün yıldız puanları (arama metniyle); gizlilik sayfasında yazdığı gibi silinir. */
const LEGACY_RATINGS_KEY = "routeai-ratings"

export default function OutcomePrompt() {
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [ctx, setCtx] = useState<ChatContextValue | null>(null)

  useEffect(() => {
    localStore().remove(LEGACY_RATINGS_KEY)
    const check = (requireAway: boolean) => {
      const due = dueOutcomePrompt(localStore(), sessionStore(), { now: Date.now(), requireAway })
      if (!due) return
      markOutcomeAsked(localStore(), sessionStore(), due)
      setCtx({ locale: "tr", dict, sessionId: getSessionId(), onToolOpen: noop, onPromptCopied: noop, send: noop, busy: false })
      setPrompt(due)
    }
    // Sonraki ziyaret: bekleme şartı yok. Aynı ziyarette sekmeye dönüş: ≥ 2 dk.
    const first = setTimeout(() => check(false), 0)
    const onVisible = () => {
      if (document.visibilityState === "visible") check(true)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearTimeout(first)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  if (!prompt || !ctx) return null
  return (
    <ChatContext.Provider value={ctx}>
      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
        {prompt.kind === "outcome" ? (
          <OutcomeCard click={prompt.click} />
        ) : (
          <ComparisonCard taskId={prompt.taskId} a={prompt.a} b={prompt.b} />
        )}
      </div>
    </ChatContext.Provider>
  )
}
