"use client"

import { useEffect, useState } from "react"
import { X, Sparkles } from "lucide-react"

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("welcomeSeen")
    if (!hasSeenWelcome) {
      setIsOpen(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem("welcomeSeen", "true")
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-md my-auto bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-card hover:bg-muted/50 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </button>

        <div className="p-6 md:p-8 space-y-5">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-primary/40 blur-xl opacity-60 rounded-full" />
              <div className="relative p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                RouteAI&apos;ye Hoş Geldin
              </span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Ne yapmak istediğini yaz, RouteAI senin için en uygun AI aracını ve alternatiflerini bulsun.
            </p>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Yakında
            </p>
            <ul className="text-xs md:text-sm text-card-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>AI akışlarını kaydet ve tekrar kullan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Hazır prompt kütüphanesi</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Topluluk puanlarıyla gerçek zamanlı performans</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-3 px-6 text-sm md:text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Başla 🎯
          </button>
        </div>
      </div>
    </div>
  )
}
