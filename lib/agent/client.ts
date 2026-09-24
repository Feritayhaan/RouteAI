// OpenAI sohbet istemcisinin ajanın kullandığı dar arayüzü. Testler bunu
// sahte bir akışla değiştirir; üretimde getOpenAIClient() sarılır.

import { getOpenAIClient } from '../openai';

export interface ToolCallDelta {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

export interface ChatChunk {
  choices: { delta?: { content?: string | null; tool_calls?: ToolCallDelta[] }; finish_reason?: string | null }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
}

export type AgentMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface ChatParams {
  model: string;
  messages: AgentMessage[];
  tools?: unknown[];
  tool_choice?: 'auto' | 'none';
  temperature: number;
  max_tokens: number;
}

export interface ChatClient {
  stream(params: ChatParams, opts: { signal?: AbortSignal }): Promise<AsyncIterable<ChatChunk>>;
}

export function openAIChatClient(): ChatClient {
  return {
    async stream(params, { signal }) {
      const client = getOpenAIClient();
      const stream = await client.chat.completions.create(
        { ...params, stream: true, stream_options: { include_usage: true } } as never,
        { signal }
      );
      return stream as unknown as AsyncIterable<ChatChunk>;
    },
  };
}
