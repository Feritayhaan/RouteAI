// Arayüz mesajları -> /api/chat'e giden geçmiş. Kartlar modele kısa metin
// olarak özetlenir (ne önerildiğini/sorulduğunu bilsin), veri kartta kalır.

import type { Card } from '../agent/cards';

export type MessagePart = { type: 'text'; text: string } | { type: 'card'; card: Card };

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
}

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
  kind?: 'text' | 'question' | 'recommendation' | 'workflow' | 'prompt';
}

function cardSummary(card: Card): string {
  switch (card.type) {
    case 'question':
      return `[asked] ${card.question} (${card.options.map((o) => o.label).join(' / ')})`;
    case 'recommendation':
      return card.noEvidence
        ? `[search_catalog ${card.taskId}: no evidence]`
        : `[recommended for ${card.taskId ?? 'unknown task'}: ${card.items.map((i) => `${i.name} (${i.productId})`).join(', ')}]`;
    case 'workflow':
      return `[workflow ${card.templateId}]`;
    case 'prompt':
      return `[prompt built for ${card.productName}]`;
    case 'prompt_question':
      return `[asked details for a ${card.productName} prompt]`;
  }
}

export function toApiMessages(messages: UIMessage[]): ApiMessage[] {
  const out: ApiMessage[] = [];
  for (const m of messages) {
    const text = m.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('').trim();
    const cards = m.parts.filter((p): p is { type: 'card'; card: Card } => p.type === 'card').map((p) => p.card);
    const content = [text, ...cards.map(cardSummary)].filter(Boolean).join('\n').slice(0, 4000);
    if (!content) continue;
    const last = cards.at(-1);
    const kind = last ? (last.type === 'prompt_question' ? 'prompt' : last.type) : undefined;
    out.push({ role: m.role, content, ...(m.role === 'assistant' && kind ? { kind } : {}) });
  }
  return out;
}
