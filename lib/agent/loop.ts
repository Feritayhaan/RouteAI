// Ajan döngüsü: model çağrısı -> araç çağrıları -> sonuçlar -> tekrar.
//
// - Metin parçaları geldikçe `text` olayı olarak akar.
// - search_catalog / get_workflow / build_prompt sonucu KART olarak da akar;
//   arayüz kartı modelin metninden değil bu veriden çizer.
// - ask_user çağrılınca soru kartı gönderilir ve tur BİTER.
// - Tur başına en fazla MAX_TOOL_CALLS araç çağrısı; sınıra gelince model
//   araçsız son bir cevap yazar.
// Kullanıcı mesajı hiçbir yere loglanmaz (loglama route'ta, sadece sayılar).

import type { Task } from '../catalog/schema';
import { defaultSearchContext, type SearchContext } from '../catalog/search';
import type { Card, ChatEvent } from './cards';
import type { AgentMessage, ChatClient, ToolCallDelta } from './client';
import { MAX_HISTORY, MAX_MODEL_ROUNDS, MAX_OUTPUT_TOKENS, MAX_QUESTIONS, MAX_TOOL_CALLS, TEMPERATURE } from './config';
import { buildSystemPrompt } from './systemPrompt';
import { executeTool, toolDefinitions, type BuildPromptFn } from './tools';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Asistan mesajının türü; 'question' olanlar soru bütçesine sayılır. */
  kind?: 'text' | 'question' | 'recommendation' | 'workflow' | 'prompt';
}

export interface AgentInput {
  messages: ConversationMessage[];
  locale: 'en' | 'tr';
}

export interface AgentDeps {
  client: ChatClient;
  model: string;
  tasks: Task[];
  search?: SearchContext;
  buildPrompt?: BuildPromptFn;
  signal?: AbortSignal;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentOutcome {
  usage: Usage;
  toolCalls: Record<string, number>;
  /** Son search_catalog görevi (analitik ve eval için). */
  taskId: string | null;
  endedWith: 'text' | 'question' | 'tool_limit' | 'round_limit';
  cards: Card[];
  modelRounds: number;
}

export async function runAgent(input: AgentInput, deps: AgentDeps, emit: (e: ChatEvent) => void): Promise<AgentOutcome> {
  const search = deps.search ?? defaultSearchContext();
  const tools = toolDefinitions(deps.tasks);
  const history = input.messages.slice(-MAX_HISTORY);
  const questionsAsked = input.messages.filter((m) => m.role === 'assistant' && m.kind === 'question').length;

  const messages: AgentMessage[] = [
    { role: 'system', content: buildSystemPrompt(deps.tasks, input.locale) },
    ...history.map((m) => ({ role: m.role, content: m.content }) as AgentMessage),
  ];

  const usage: Usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const toolCalls: Record<string, number> = {};
  const cards: Card[] = [];
  let totalToolCalls = 0;
  let taskId: string | null = null;
  const pushCard = (card: Card) => {
    cards.push(card);
    emit({ type: 'card', card });
  };

  for (let round = 1; round <= MAX_MODEL_ROUNDS; round++) {
    const toolsAllowed = totalToolCalls < MAX_TOOL_CALLS;
    const stream = await deps.client.stream(
      {
        model: deps.model,
        messages,
        tools,
        tool_choice: toolsAllowed ? 'auto' : 'none',
        temperature: TEMPERATURE,
        max_tokens: MAX_OUTPUT_TOKENS,
      },
      { signal: deps.signal }
    );

    let text = '';
    const calls = new Map<number, { id: string; name: string; arguments: string }>();
    for await (const chunk of stream) {
      if (chunk.usage) {
        usage.promptTokens += chunk.usage.prompt_tokens;
        usage.completionTokens += chunk.usage.completion_tokens;
        usage.totalTokens += chunk.usage.total_tokens;
      }
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        text += delta.content;
        emit({ type: 'text', delta: delta.content });
      }
      for (const tc of delta.tool_calls ?? []) mergeToolCall(calls, tc);
    }

    if (calls.size === 0 || !toolsAllowed) {
      return { usage, toolCalls, taskId, endedWith: toolsAllowed ? 'text' : 'tool_limit', cards, modelRounds: round };
    }

    const ordered = [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
    messages.push({
      role: 'assistant',
      content: text || null,
      tool_calls: ordered.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } })),
    });

    for (const call of ordered) {
      if (totalToolCalls >= MAX_TOOL_CALLS) {
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'tool_call_limit', instruction: 'Answer the user now without more tools.' }) });
        continue;
      }
      totalToolCalls++;
      toolCalls[call.name] = (toolCalls[call.name] ?? 0) + 1;

      const exec = await executeTool(call.name, call.arguments, {
        search,
        locale: input.locale,
        questionsAsked,
        maxQuestions: MAX_QUESTIONS,
        buildPrompt: deps.buildPrompt,
      });
      if (exec.taskId) taskId = exec.taskId;
      if (exec.card) pushCard(exec.card);
      if (exec.endTurn) {
        return { usage, toolCalls, taskId, endedWith: 'question', cards, modelRounds: round };
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(exec.result) });
    }
  }

  return { usage, toolCalls, taskId, endedWith: 'round_limit', cards, modelRounds: MAX_MODEL_ROUNDS };
}

function mergeToolCall(calls: Map<number, { id: string; name: string; arguments: string }>, tc: ToolCallDelta) {
  const current = calls.get(tc.index) ?? { id: '', name: '', arguments: '' };
  if (tc.id) current.id = tc.id;
  if (tc.function?.name) current.name += tc.function.name;
  if (tc.function?.arguments) current.arguments += tc.function.arguments;
  calls.set(tc.index, current);
}
