"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Monitor, Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme, resolvedTheme } = useTheme()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    // Tema döngüsü: system -> light -> dark -> system
    const cycleTheme = () => {
        if (theme === "system") {
            setTheme("light")
        } else if (theme === "light") {
            setTheme("dark")
        } else {
            setTheme("system")
        }
    }

    // Hangi ikon gösterilecek
    const getIcon = () => {
        if (theme === "system") {
            return <Monitor className="w-5 h-5" />
        } else if (theme === "light" || (theme === "system" && resolvedTheme === "light")) {
            return <Sun className="w-5 h-5" />
        } else {
            return <Moon className="w-5 h-5" />
        }
    }

    const getLabel = () => {
        if (theme === "system") return "Sistem"
        if (theme === "light") return "Aydınlık"
        return "Karanlık"
    }

    return (
        <div className="fixed top-6 right-6 z-40 animate-in fade-in slide-in-from-top-4 duration-500">
            <button
                onClick={cycleTheme}
                className="group relative bg-card/80 backdrop-blur-lg border border-border/50 rounded-2xl shadow-2xl p-3 
                           hover:bg-muted/80 hover:scale-105 active:scale-95
                           transition-all duration-300 ease-out"
                aria-label={`Tema: ${getLabel()}`}
            >
                {/* İkon container - animasyonlu */}
                <div className="relative w-5 h-5 transition-transform duration-300 group-hover:rotate-12">
                    <div className="absolute inset-0 transition-all duration-300 ease-out">
                        {getIcon()}
                    </div>
                </div>

                {/* Tooltip */}
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 
                                 bg-popover border border-border rounded-lg text-xs font-medium 
                                 text-popover-foreground whitespace-nowrap 
                                 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100
                                 transition-all duration-200 pointer-events-none shadow-lg">
                    {getLabel()}
                </span>

                {/* Ripple efekti */}
                <span className="absolute inset-0 rounded-2xl bg-primary/10 scale-0 group-active:scale-100 
                                 transition-transform duration-200 ease-out" />
            </button>
        </div>
    )
}
