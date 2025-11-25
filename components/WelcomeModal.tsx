"use client"

import { useEffect, useState } from "react"
import { X, Sparkles } from "lucide-react"

export default function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        // Check if user has seen the welcome modal before
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    aria-label="Kapat"
                >
                    <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </button>

                {/* Content */}
                <div className="p-8 md:p-10 space-y-6">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-primary/40 blur-xl opacity-60 rounded-full" />
                            <div className="relative p-4 bg-primary/10 rounded-2xl border border-primary/20">
                                <Sparkles className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                                RouteAI&apos;ye Hoş Geldin
                            </span>
                        </h2>
                        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                            Ne yapmak istediğini yaz, RouteAI seni saniyeler içinde en doğru yapay zeka aracına
                            yönlendirsin. Tek ekranda: önerilen araç, sebebi ve hazır prompt.
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground/80">
                            Bu pencereyi kapattıktan sonra tek yapman gereken ihtiyacını yazmak. Geri kalanını
                            RouteAI senin yerine düşünüyor.
                        </p>
                    </div>

                    {/* Features Coming Soon */}
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Yakında RouteAI&apos;de
                        </p>
                        <ul className="text-sm text-card-foreground space-y-1.5">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Favori AI araçlarını ve akışlarını (workflow) kaydet
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Hazır, test edilmiş prompt kütüphanesinden direkt kopyala
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Sana özel seçilen &quot;haftanın AI aracı&quot;nı keşfet
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Topluluk skorlarına göre gerçek zamanlı araç performansını gör
                            </li>
                        </ul>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={handleClose}
                        className="w-full py-3.5 px-6 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        Başla, ihtiyacını yaz 🎯
                    </button>
                </div>
            </div>
        </div>
    )
}
