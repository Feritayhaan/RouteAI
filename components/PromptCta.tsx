"use client"

// Seçimsel prompt çağrısı: öneri kartında, kullanıcının sorgusuna ve önerilen
// araca göre yazılmış belirgin düğme. Tıklanmadan /api/prompt/start çağrılmaz
// (OpenAI maliyeti sadece kullanıcı isteyince). Sorgudan kısa bir alıntı,
// promptun bu isteğe özel yazılacağını gösterir.

const EXCERPT_MAX = 90

function excerpt(query: string): string {
  const flat = query.replace(/\s+/g, " ").trim()
  return flat.length > EXCERPT_MAX ? `${flat.slice(0, EXCERPT_MAX - 1).trimEnd()}…` : flat
}

export default function PromptCta({ label, hint, query, onClick, compact = false }: {
  /** "✨ Bu sorgu için {araç} promptu oluştur" (ürün adı yerleştirilmiş). */
  label: string
  hint?: string
  /** Kullanıcının sorgusu: kısaltılmış alıntı olarak gösterilir. */
  query?: string
  onClick: () => void
  compact?: boolean
}) {
  const quote = query ? excerpt(query) : ""
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/cta w-full text-left rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:border-primary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? "min-h-11 px-3 py-2" : "min-h-12 px-4 py-3"}`}
    >
      <span className={`block font-semibold text-primary ${compact ? "text-xs" : "text-sm md:text-base"}`}>{label}</span>
      {(hint || quote) && (
        <span className="mt-0.5 block text-[11px] md:text-xs text-muted-foreground">
          {quote && <span className="italic text-foreground/80 break-words">“{quote}”</span>}
          {quote && hint && " · "}
          {hint}
        </span>
      )}
    </button>
  )
}
