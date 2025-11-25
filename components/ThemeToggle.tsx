"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Monitor, Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    const themes = [
        { name: "system", icon: Monitor, label: "Sistem" },
        { name: "light", icon: Sun, label: "Beyaz" },
        { name: "dark", icon: Moon, label: "Karanlık" }
    ]

    return (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card/80 backdrop-blur-lg border border-border/50 rounded-2xl shadow-2xl p-2 flex gap-1">
                {themes.map(({ name, icon: Icon, label }) => (
                    <button
                        key={name}
                        onClick={() => setTheme(name)}
                        className={`
              relative group px-3 py-2 rounded-xl transition-all duration-200
              ${theme === name
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            }
            `}
                        title={label}
                        aria-label={label}
                    >
                        <Icon className="w-5 h-5" />

                        {/* Tooltip */}
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-popover border border-border rounded-lg text-xs font-medium text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}
