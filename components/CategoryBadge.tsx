"use client"

export default function CategoryBadge({ category }: { category: string }) {
  const categoryLabels: Record<string, string> = {
    gorsel: '🎨 Görsel',
    metin: '✍️ Metin',
    ses: '🎵 Ses',
    video: '🎬 Video',
    arastirma: '🔍 Araştırma',
    veri: '📊 Veri',
    kod: '💻 Kod',
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase">
      {categoryLabels[category] || category}
    </span>
  )
}
