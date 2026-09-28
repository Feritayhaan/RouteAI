"use client"

// Ana sayfada bir araç açıldı ("Araca Git", alternatif, iş akışı adımı):
// sonradan "İşini gördü mü?" diye sormak için tarayıcıda kaydedilir
// (lib/chat/outcomes: 7 gün, arama metni YOK) ve anonim olay gönderilir.

import { trackEvent } from "@/lib/analytics/client"
import { recordToolClick } from "@/lib/chat/outcomes"
import { localStore } from "@/lib/chat/storage"

export function onToolOpen(tool: { productId?: string; toolName: string }, taskId?: string): void {
  if (!tool.productId || !taskId) return
  try {
    recordToolClick(localStore(), { productId: tool.productId, productName: tool.toolName, taskId, clickedAt: Date.now() })
  } catch {
    // kayıt başarısızsa akış bozulmaz
  }
  trackEvent("tool_click", { taskId })
}
