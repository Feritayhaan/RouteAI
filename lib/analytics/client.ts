"use client"

// Analitik olayı gönderimi (anonim). Ham içerik, mesaj metni ve IP
// gönderilmez; sadece olay adı, anonim oturum kimliği ve kodlar.
// Hata sessizce yutulur: analitik hiçbir zaman kullanıcı akışını bozmaz.

import { getSessionId } from '../chat/session';
import type { EventName } from './events';

export interface EventProps {
  taskId?: string;
  guideId?: string;
  guideVersion?: number;
  refinementId?: string;
  variant?: 'safe' | 'creative';
}

export function trackEvent(name: EventName, props: EventProps = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ name, sessionId: getSessionId(), ...props });
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/events', blob)) {
      void fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // analitik akışı bozmaz
  }
}
