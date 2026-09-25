// /api/chat NDJSON akışını satır satır olaya çevirir. Parçalar satır
// ortasında bölünebilir; eksik satır bir sonraki parçaya kadar tutulur.

import type { ChatEvent } from '../agent/cards';

export function createNdjsonParser(onEvent: (e: ChatEvent) => void) {
  let buffer = '';
  const emitLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as ChatEvent);
    } catch {
      onEvent({ type: 'error', code: 'bad_stream' });
    }
  };
  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(emitLine);
    },
    flush() {
      emitLine(buffer);
      buffer = '';
    },
  };
}
