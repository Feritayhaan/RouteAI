"use client"

import { useState, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, MessageCircle, Wand2 } from "lucide-react"
import WelcomeModal from "@/components/WelcomeModal"
import ThemeToggle from "@/components/ThemeToggle"
import WorkflowDisplay from "@/components/WorkflowDisplay"
import SimpleRecommendationDisplay from "@/components/SimpleRecommendationDisplay"
import ClarifyDisplay from "@/components/ClarifyDisplay"
import NoEvidenceDisplay from "@/components/NoEvidenceDisplay"
import OutcomePrompt from "@/components/OutcomePrompt"
import PromptPanel from "@/components/PromptPanel"
import PricingToggle, { type PricingFilter } from "@/components/PricingToggle"
import { useDevice } from "@/components/device/DeviceProvider"
import { sidePanel } from "@/components/layout"
import { getDictionary } from "@/lib/i18n"
import { AUTO_TOOL, promptProductId, resolvePromptTarget } from "@/lib/promptBuilder/products"
import { apiResponseFromV3, type ApiResponse } from "@/lib/types"
import type { RecommendV3Result } from "@/lib/recommendV3"
import type { PromptCard as PromptCardData, PromptQuestionCard as PromptQuestionData } from "@/lib/agent/cards"

const dict = getDictionary("tr")

/** Başlık, giriş ve notlar her cihazda bu genişlikte; sadece sonuç alanı yan yana açılınca genişler. */
const narrow = "mx-auto w-full max-w-2xl"

/** Prompt için aday araçlar: tek öneride ana araç, workflow'da adımların ana araçları. Netleştirme ve kanıtsız durumda öneri yok. */
function recommendedTools(response: ApiResponse | null): string[] {
  if (!response) return []
  if (response.type === "workflow") return response.workflow.steps.map((s) => s.primary.toolName)
  if (response.type === "clarify" || response.type === "no_evidence") return []
  return response.main ? [response.main.toolName] : []
}

/** Prompt için kullanıcının işi: tek öneride bulunan görev (araca özel rehber yoksa görev şablonu seçilir). İş akışında adımın görevi kullanılır. */
function recommendedTaskId(response: ApiResponse | null): string | undefined {
  if (!response || response.type === "workflow" || response.type === "clarify" || response.type === "no_evidence") return undefined
  return response.taskId
}

/** Prompt kutusundaki "Başka araç için" düğmeleri: tek önerideki ana, alternatif ve doğrulanmamış araçlar (prompt yazılabilenler). */
function promptChoices(response: ApiResponse | null): string[] {
  if (!response || response.type === "workflow" || response.type === "clarify" || response.type === "no_evidence" || !response.main) return []
  const names = [response.main, ...(response.alternatives ?? []), ...(response.unverified ?? [])].map((t) => t.toolName)
  return [...new Set(names)].filter((name) => promptProductId(name))
}

export default function HomeClient() {
  const { split } = useDevice()
  const [query, setQuery] = useState("")
  const [pricingFilter, setPricingFilter] = useState<PricingFilter>("all")
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Prompt oluşturucu: filtrenin solunda aç/kapa. Araç: varsayılan önerilen
  // araç; kart ya da prompt kutusundaki düğmeyle sonuçtaki başka bir araç.
  const [promptEnabled, setPromptEnabled] = useState(false)
  const [promptTool, setPromptTool] = useState(AUTO_TOOL)
  const [submitted, setSubmitted] = useState<{ query: string; n: number } | null>(null)
  // Aynı arama + araç için üretilmiş prompt: araç değiştirip geri dönünce yeniden üretilmez
  const [promptCache] = useState(() => new Map<string, PromptCardData | PromptQuestionData>())

  /**
   * taskId: v3 netleştirmesinde seçilen görev — aynı sorgu o görevle yeniden istenir.
   * correctedQuery: "… mi demek istedin?" yazım önerisi — arama kutusu da düzeltilmiş sorguyla güncellenir.
   */
  const getRecommendation = async (taskId?: string, correctedQuery?: string) => {
    const prompt = correctedQuery?.trim() || (taskId && submitted ? submitted.query : query.trim())
    if (!prompt) return
    if (correctedQuery) setQuery(correctedQuery)

    setIsLoading(true)
    setError(null)
    setResponse(null)
    setPromptTool(AUTO_TOOL) // yeni sonuç: prompt yine önerilen araç için
    setSubmitted((prev) => ({ query: prompt, n: (prev?.n ?? 0) + 1 }))

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, pricingFilter, ...(taskId ? { taskId } : {}) }),
      })

      if (!res.ok) {
        throw new Error("API isteği başarısız oldu")
      }

      const contentType = res.headers.get('Content-Type') || '';

      // NDJSON streaming response
      if (contentType.includes('application/x-ndjson')) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("Stream okunamadı");

        const decoder = new TextDecoder();
        let buffer = '';
        let assembledResponse: Record<string, unknown> = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // son satır tamamlanmamış olabilir

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line);

              if (chunk.chunk === 'v3') {
                // RECOMMENDER=v3: tek satır, dört durumdan biri (lib/recommendV3.ts).
                const mapped = apiResponseFromV3(chunk as RecommendV3Result, dict)
                if (mapped) setResponse(mapped)
                else setError(dict.v3.filteredEmpty)
              } else if (chunk.chunk === 'main') {
                assembledResponse = {
                  type: chunk.type,
                  category: chunk.category,
                  main: chunk.main,
                  alternatives: [],
                };
                // Ana sonucu hemen göster
                setResponse({ ...assembledResponse } as unknown as ApiResponse);
              } else if (chunk.chunk === 'alternatives') {
                assembledResponse.alternatives = chunk.alternatives;
                setResponse({ ...assembledResponse } as unknown as ApiResponse);
              } else if (chunk.chunk === 'meta' && chunk.relaxedConstraint === 'pricing') {
                // Sorgudaki fiyat koşulu gevşetildi: sessiz kalma, kartta söyle.
                assembledResponse.relaxedPricing = chunk.requestedPricing ?? null;
                setResponse({ ...assembledResponse } as unknown as ApiResponse);
              }
              // meta'daki debug alanları yok sayılır
            } catch {
              console.warn('NDJSON parse hatası:', line);
            }
          }
        }

        // LOW_CONFIDENCE veya hata kontrolü
        if ('error' in assembledResponse) {
          const data = assembledResponse as { error: string; isLowConfidence?: boolean; suggestions?: string[] };
          if (data.isLowConfidence && data.error) {
            const suggestionText = data.suggestions
              ? `\n\n${data.suggestions.map((s: string) => `• ${s}`).join('\n')}`
              : '';
            setError(data.error + suggestionText);
            return;
          }
          throw new Error(data.error);
        }
      } else {
        // Standart JSON fallback
        const data = await res.json();

        // LOW_CONFIDENCE hatası için özel işlem
        if (data.isLowConfidence && data.error) {
          const suggestionText = data.suggestions
            ? `\n\n${data.suggestions.map((s: string) => `• ${s}`).join('\n')}`
            : '';
          setError(data.error + suggestionText)
          return
        }

        // Diğer hatalar
        if (data.error) {
          throw new Error(data.error)
        }

        setResponse(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu")
      console.error("Hata:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      getRecommendation()
    }
  }

  // Check if response is a workflow
  const isWorkflow = response?.type === 'workflow'

  // Prompt: "Bana Yol Göster" sonrası, açıksa önerinin altında aynı ekranda,
  // önerilen araç için. Kartta ya da kutuda başka bir araç seçilirse o araç için.
  // İş akışında prompt adımın içinde açılır (WorkflowDisplay, adım başına düğme).
  const stepPrompts = isWorkflow
  const promptTarget = promptEnabled && submitted && !isLoading && !stepPrompts
    ? resolvePromptTarget(promptTool, recommendedTools(response))
    : null
  const promptKey = promptTarget && submitted
    ? `${"productId" in promptTarget ? promptTarget.productId : promptTarget.missing}|${recommendedTaskId(response) ?? ""}|${submitted.query}|${submitted.n}`
    : ""

  // Tek öneride prompt açıkken geniş ekranda (lg) öneri solda, prompt sağda.
  // Saf CSS (lg:grid): ilk ekranda kayma yok; dar ekranda bugünkü gibi alt alta.
  const sideBySide = !!promptTarget && !!response && response.type !== "workflow" && response.type !== "clarify" && response.type !== "no_evidence"

  /** Kart ya da prompt kutusundaki düğme: prompt o araç için yazılır; alt alta düzende kutuya kaydırılır. */
  const choosePromptTool = (toolName: string) => {
    setPromptTool(toolName)
    setPromptEnabled(true)
    if (split) return // panel zaten önerinin yanında
    setTimeout(() => document.getElementById("prompt-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  return (
    <>
      <WelcomeModal />
      <ThemeToggle />
      <main className="min-h-screen bg-background flex items-center justify-center p-3 md:p-6 relative overflow-clip">
        {/* Gradient Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Mobilde tek, küçük ışık: büyük blur katmanları telefonda kaydırmayı ağırlaştırır */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] mobile:w-[420px] mobile:h-[420px] mobile:blur-2xl bg-gradient-to-b from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl opacity-60 dark:opacity-40" />
          <div className="mobile:hidden absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-l from-primary/15 to-transparent rounded-full blur-3xl opacity-50 dark:opacity-30" />
          <div className="mobile:hidden absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl opacity-40 dark:opacity-25" />
        </div>

        <div className="w-full max-w-6xl space-y-6 md:space-y-10 relative z-10 px-2 md:px-0">
          {/* Header */}
          <div className={`${narrow} text-center space-y-3 md:space-y-5 animate-in fade-in slide-in-from-top-4 duration-700 motion-reduce:animate-none`}>
            <div className="flex items-center justify-center mb-2 md:mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-primary/40 blur-2xl mobile:blur-xl opacity-60 dark:opacity-50 rounded-full animate-pulse mobile:animate-none motion-reduce:animate-none" />
                <div className="relative z-10">
                  <Sparkles className="w-12 h-12 md:w-20 md:h-20 lg:w-24 lg:h-24 mobile:w-10 mobile:h-10 text-primary drop-shadow-2xl animate-pulse mobile:animate-none motion-reduce:animate-none"
                    style={{
                      filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6)) drop-shadow(0 0 16px hsl(var(--primary) / 0.4))'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-balance leading-[1.1]">
                <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  RouteAI
                </span>
                <span className="text-foreground/90"> - </span>
                <span className="bg-gradient-to-r from-foreground/90 via-foreground to-foreground/90 bg-clip-text text-transparent">
                  Yapay Zeka Navigatörü
                </span>
              </h1>

              <p className="text-xs md:text-sm lg:text-base font-semibold text-muted-foreground/80 tracking-wide uppercase">
                🚀 Artık Workflow Desteği ile!
              </p>
            </div>

            <p className="text-sm md:text-lg lg:text-xl text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed font-normal mt-3 md:mt-6">
              Ne yapmak istediğini yaz, <strong>tek araç veya adım adım workflow</strong> önerilsin
            </p>
          </div>

          {/* Input Section */}
          <div className={`${narrow} space-y-3 md:space-y-4`}>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

              <div className="relative bg-card/80 dark:bg-card border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 focus-within:shadow-2xl focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/30">
                <div className="absolute top-3 left-3 md:top-5 md:left-5 z-10">
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-300" />
                </div>

                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Örnek: Çizgi roman oluşturmak istiyorum, Podcast başlatmak istiyorum, Marka kimliği tasarla..."
                  className="w-full min-h-[100px] md:min-h-[140px] pl-11 md:pl-14 pr-3 md:pr-5 pt-3 md:pt-5 pb-3 md:pb-5 text-base md:text-lg bg-transparent border-0 rounded-2xl resize-none focus:outline-none focus:ring-0 transition-all placeholder:text-muted-foreground/60"
                  style={{ boxShadow: 'none' }}
                />
              </div>
            </div>

            {/* Filtre satırı: iki eşit, tam genişlik düğme — prompt aç/kapa ve fiyat */}
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setPromptEnabled((v) => !v)}
                aria-pressed={promptEnabled}
                className={`inline-flex h-11 md:h-12 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-3 text-xs md:text-sm font-medium shadow-lg transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${promptEnabled ? "bg-primary text-primary-foreground border-primary" : "bg-card/80 dark:bg-card border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}
              >
                <Wand2 className="w-4 h-4 shrink-0" aria-hidden />
                <span className="truncate">{dict.prompt.toggle}</span>
              </button>

              <PricingToggle value={pricingFilter} onChange={setPricingFilter} wide />
            </div>

            <Button
              onClick={() => getRecommendation()}
              disabled={isLoading || !query.trim()}
              className="w-full h-12 md:h-14 text-base md:text-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Düşünüyorum...
                </span>
              ) : (
                "Bana Yol Göster"
              )}
            </Button>
          </div>

          {/* "İşini gördü mü?" — açılan aracın sonucu (P15) */}
          <div className={narrow}>
            <OutcomePrompt />
          </div>

          {/* Error Message */}
          {error && !isLoading && (
            <div className={`${narrow} animate-in fade-in duration-300`}>
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 md:p-6">
                <p className="text-destructive font-medium text-sm md:text-base whitespace-pre-line text-left">{error}</p>
              </div>
            </div>
          )}

          {/* Sonuç + prompt: geniş ekranda yan yana (prompt sağda, sticky), dar ekranda alt alta */}
          {((response && !isLoading) || (promptTarget && submitted)) && (
            <div
              className={
                sideBySide
                  ? "mx-auto w-full max-w-2xl space-y-6 md:space-y-10 lg:max-w-6xl lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start"
                  : isWorkflow
                    ? "mx-auto w-full max-w-2xl lg:max-w-6xl" // daraltma WorkflowDisplay'de: adım promptu açılınca yan yana
                    : `${narrow} space-y-6 md:space-y-10`
              }
            >
              {response && !isLoading && (
                response.type === "workflow" ? (
                  <WorkflowDisplay
                    key={submitted?.n}
                    workflow={response.workflow}
                    goal={submitted?.query ?? query}
                    autoPrompt={promptEnabled && stepPrompts}
                  />
                ) : response.type === "clarify" ? (
                  <ClarifyDisplay clarify={response} dict={dict} onSelect={(taskId) => getRecommendation(taskId)} onSuggest={(suggestion) => getRecommendation(undefined, suggestion)} disabled={isLoading} />
                ) : response.type === "no_evidence" ? (
                  <NoEvidenceDisplay result={response} dict={dict} />
                ) : (
                  <SimpleRecommendationDisplay
                    key={`${submitted?.query ?? query}-${response.main.toolName}`}
                    recommendation={response}
                    query={submitted?.query ?? query}
                    onPrompt={choosePromptTool}
                    onSelectTask={(taskId) => getRecommendation(taskId)}
                    beside={sideBySide}
                  />
                )
              )}

              {/* Prompt (aynı ekranda: geniş ekranda önerinin yanında, dar ekranda altında) */}
              {promptTarget && submitted && (
                <div id="prompt-panel" className={`scroll-mt-20 ${sideBySide ? sidePanel : ""}`}>
                  <PromptPanel
                    key={promptKey}
                    target={promptTarget}
                    goal={submitted.query}
                    taskId={recommendedTaskId(response)}
                    cached={promptCache.get(promptKey)}
                    onResult={(card) => promptCache.set(promptKey, card)}
                    choices={promptChoices(response)}
                    onChoose={choosePromptTool}
                  />
                </div>
              )}
            </div>
          )}

          <p className={`${narrow} text-center text-xs text-muted-foreground/80`}>
            <a href="/privacy?lang=tr" className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-foreground">Gizlilik</a>
          </p>
        </div>
      </main>
    </>
  )
}
