"use client"

import * as Tooltip from "@radix-ui/react-tooltip"
import type { Card } from "@/lib/agent/cards"
import { makePricing } from "@/lib/pricing"
import { getDictionary, type Locale } from "@/lib/i18n"
import { ChatContext } from "./ChatContext"
import MessageBubble from "./MessageBubble"
import OutcomeCard from "./OutcomeCard"
import ComparisonCard from "./ComparisonCard"
import type { ChatMessage } from "./useChat"

// ÖRNEK VERİ: hayali ürün adları ve sayılar; gerçek katalog ya da puan DEĞİL.
// Sadece geliştirme ortamında (/dev/cards) arayüzü görmek için.
const example = (name: string) => `https://example.com/${name.toLowerCase().replace(/\W+/g, "-")}`
const pricing = makePricing("freemium", 10, "2026-09-01")

function cards(locale: Locale): Card[] {
  const tr = locale === "tr"
  return [
    {
      type: "question",
      question: tr ? "Logoda dükkânın adı yazacak mı?" : "Should the logo include the shop name?",
      options: [{ id: "o1", label: tr ? "Evet" : "Yes" }, { id: "o2", label: tr ? "Hayır, sadece simge" : "No, icon only" }],
      allowFreeText: true,
    },
    {
      type: "recommendation",
      mode: "catalog",
      taskId: "image.logo",
      noEvidence: false,
      relaxedConstraint: ["pricing"],
      items: [
        {
          productId: "example-a", name: tr ? "Örnek Araç A" : "Example Tool A", url: example("a"), q: 0.71, confidence: "medium", ownN: 12,
          benchmarkShare: 0.36, shares: { users: 0.43, expert: 0.21, benchmark: 0.36 }, pricing, dataDate: "2026-09-20",
          reasons: [
            { code: "outcome_success", params: { pct: 75, n: 12 } },
            { code: "benchmark_rank", params: { source: "lmarena", arena: "text_to_image", rank: 3, total: 40 } },
            { code: "free_tier", params: {} },
          ],
          sources: [{ id: "lmarena", label: "LMArena", url: "https://lmarena.ai/leaderboard" }, { id: "routeai-users", label: "RouteAI users" }],
        },
        {
          productId: "example-b", name: tr ? "Örnek Araç B" : "Example Tool B", url: example("b"), q: 0.62, confidence: "low", ownN: 0,
          benchmarkShare: 1, shares: { users: 0, expert: 0, benchmark: 1 }, pricing: makePricing("paid", 12, "2026-09-01"), dataDate: "2026-09-18",
          reasons: [{ code: "benchmark_only", params: {} }], sources: [{ id: "artificialanalysis", label: "Artificial Analysis", url: "https://artificialanalysis.ai" }],
        },
        {
          productId: "example-c", name: tr ? "Örnek Araç C" : "Example Tool C", url: example("c"), q: 0.55, confidence: "high", ownN: 40,
          benchmarkShare: 0.2, shares: { users: 0.8, expert: 0, benchmark: 0.2 }, pricing: makePricing("free"), dataDate: "2026-09-22",
          reasons: [], sources: [],
        },
      ],
    },
    {
      type: "prompt",
      promptSessionId: "p_preview", productId: "example-a", productName: tr ? "Örnek Araç A" : "Example Tool A", productUrl: example("a"),
      guideId: "midjourney", guideVersion: 1, draft: true, versionN: 1, refinementsLeft: 10,
      filledBy: { user: 2, inferred: 1, default: 2 },
      variants: [
        {
          id: "safe", negativePrompt: null, validation: { status: "passed", errors: [] },
          prompt: "minimal flat logo for a neighborhood bakery named \"Maya's Oven\", warm terracotta and cream, hand-drawn wheat icon, readable serif wordmark, white background --ar 1:1",
          settings: [{ key: "aspect ratio", value: "1:1" }],
        },
        {
          id: "creative", negativePrompt: "photo, clutter", validation: { status: "unchecked", errors: [tr ? "En-boy oranı parametresi ekle." : "Add an aspect ratio parameter."] },
          prompt: "playful badge logo for \"Maya's Oven\": a smiling loaf with a tiny chef hat, retro 70s lettering, sunset palette",
          settings: [],
        },
      ],
      assumptions: [
        {
          slotId: "mood", value: "bright and cheerful", why: tr ? "Belirtilmedi; fırın için sıcak bir hava seçtim." : "Not specified; picked a warm feel for a bakery.",
          question: tr ? "Nasıl bir hava?" : "What mood?",
          options: [{ id: "bright", label: tr ? "Aydınlık" : "Bright", value: "bright and cheerful" }, { id: "soft", label: tr ? "Yumuşak, pastel" : "Soft, pastel", value: "soft pastel" }],
        },
      ],
      refinements: [
        { id: "more-detail", label: tr ? "Daha detaylı" : "More detail", kind: "guide", slotId: null, value: null, instruction: "..." },
        { id: "square", label: tr ? "Kare" : "Square", kind: "guide", slotId: "aspect", value: "1:1", instruction: null },
        { id: "suggested-1", label: tr ? "Tek renk dene" : "Try one color", kind: "suggested", slotId: null, value: null, instruction: "..." },
      ],
      howToUse: tr
        ? ["Promptu kopyala.", "Aracı aç ve yeni bir görsel oluştur.", "Beğendiğin sonucu büyüt ve indir."]
        : ["Copy the prompt.", "Open the tool and create a new image.", "Upscale and download the one you like."],
    },
    {
      type: "prompt_question", promptSessionId: "p_preview_q", guideId: "midjourney", productName: tr ? "Örnek Araç A" : "Example Tool A",
      questions: [
        { slotId: "style", question: tr ? "Nasıl bir görsel stil?" : "What visual style?", options: [{ id: "photo", label: tr ? "Fotoğraf" : "Photo" }, { id: "illustration", label: tr ? "İllüstrasyon" : "Illustration" }], allowFreeText: true },
        { slotId: "aspect", question: tr ? "Hangi format?" : "Which format?", options: [{ id: "square", label: tr ? "Kare 1:1" : "Square 1:1" }, { id: "wide", label: tr ? "Yatay 16:9" : "Wide 16:9" }], allowFreeText: true },
      ],
    },
    { type: "recommendation", mode: "catalog", taskId: "3d.generate", noEvidence: true, items: [] },
  ]
}

export default function CardsPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale)
  const all = cards(locale)
  const messages: ChatMessage[] = [
    { id: "u1", role: "user", parts: [{ type: "text", text: locale === "tr" ? "Fırınım için logo lazım" : "I need a logo for my bakery" }] },
    { id: "a1", role: "assistant", status: "done", parts: [{ type: "card", card: all[0] }] },
    { id: "u2", role: "user", parts: [{ type: "text", text: locale === "tr" ? "Evet" : "Yes" }] },
    {
      id: "a2", role: "assistant", status: "done",
      parts: [{ type: "text", text: locale === "tr" ? "Şu an öne çıkan seçenek Örnek Araç A." : "Currently the strongest option is Example Tool A." }, { type: "card", card: all[1] }],
    },
    { id: "a3", role: "assistant", status: "done", parts: [{ type: "card", card: all[2] }] },
    { id: "a4", role: "assistant", status: "done", parts: [{ type: "card", card: all[3] }] },
    { id: "a4b", role: "assistant", status: "done", parts: [{ type: "card", card: all[4] }] },
    { id: "a5", role: "assistant", status: "error", parts: [] },
  ]
  const click = (id: string, name: string) => ({ productId: id, productName: name, taskId: "image.logo", clickedAt: 0 })

  return (
    <ChatContext.Provider value={{ locale, dict, sessionId: "preview-session", onToolOpen: () => {}, onPromptCopied: () => {}, send: () => {}, busy: false }}>
      <Tooltip.Provider>
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          <p className="rounded-xl border border-dashed border-amber-500 p-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            DEV PREVIEW — {locale === "tr" ? "ÖRNEK VERİ, gerçek ürün ya da puan değil" : "SAMPLE DATA, not real products or scores"}
          </p>
          {messages.map((m, i) => (
            <MessageBubble key={m.id} message={m} isLast={i === 1} onRetry={() => {}} />
          ))}
          <OutcomeCard click={click("example-a", locale === "tr" ? "Örnek Araç A" : "Example Tool A")} />
          <ComparisonCard taskId="image.logo" a={click("example-a", "A")} b={click("example-b", "B")} />
        </main>
      </Tooltip.Provider>
    </ChatContext.Provider>
  )
}
