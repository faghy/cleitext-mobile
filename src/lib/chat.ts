import { errorMessage, type ApiClient } from './api';

/**
 * Chriss, the site's AI assistant: POST /api/v1/assistants/chat with the
 * conversation so far; the answer comes as JSON lines (AssistantChatEvent of
 * the core). The `done` event carries the whole conversation (tool calls
 * included), sent back with the next question.
 */

export type ChatHistoryMessage = Record<string, unknown> & { role: 'user' | 'assistant' | 'tool' };

export type ChatEvent =
  | { type: 'tool'; name: string }
  | { type: 'tool-done'; name: string; ok: boolean }
  | { type: 'text'; text: string }
  | { type: 'done'; messages: ChatHistoryMessage[] }
  | { type: 'error'; message: string; [key: string]: unknown }
  /** Chriss base (the free AI): the request is on its way, read slowly. */
  | { type: 'reading' }
  /** Chriss base: the request waits its turn, with `position` requests ahead of it (core 0.117.1). */
  | { type: 'queue'; position: number }
  /** Chriss base: the free requests left today. */
  | { type: 'quota'; remaining: number; limit: number | null; resetAt: string | null }
  | { type: 'ping' };

/**
 * The requests ahead of this one at the free service, after an event: set
 * by `queue`, kept by `ping`, gone with anything else (its turn came).
 */
export function queueAfter(current: number | null, event: ChatEvent): number | null {
  if (event.type === 'queue')
    return typeof event.position === 'number' && event.position > 0 ? event.position : null;
  return event.type === 'ping' ? current : null;
}

export type ChatProblem =
  /** No AI service connected to the site (Admin → Chriss → Settings). */
  | { kind: 'no_provider' }
  /** The free daily requests are used up. */
  | { kind: 'quota'; limit?: number; resetAt?: string }
  /** The site does not take the chat from the app (older Cleitext). */
  | { kind: 'unsupported' }
  /** The account may not use Chriss on this site. */
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string };

export interface ChatResult {
  /** The text of the answer (the last text event). */
  text: string;
  /** The conversation to send with the next question; null on problems. */
  messages: ChatHistoryMessage[] | null;
  problem: ChatProblem | null;
}

/** A quota error, wherever the core put it (top level, `error`, `detail`, or in a message). */
export function findQuota(value: unknown, depth = 0): { limit?: number; resetAt?: string } | null {
  if (depth > 4 || value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (!/quota_exceeded/.test(value)) return null;
    const json = value.slice(value.indexOf('{'));
    if (json.startsWith('{')) {
      try {
        return findQuota(JSON.parse(json), depth + 1) ?? {};
      } catch {
        // Not JSON: the name alone is enough.
      }
    }
    return {};
  }
  if (typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.error === 'quota_exceeded' || record.code === 'quota_exceeded') {
    return {
      ...(typeof record.limit === 'number' ? { limit: record.limit } : {}),
      ...(typeof record.resetAt === 'string' ? { resetAt: record.resetAt } : {}),
    };
  }
  for (const key of ['error', 'detail', 'message', 'cause', 'body']) {
    const found = findQuota(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

export function problemOf(source: unknown, status = 200): ChatProblem {
  const quota = findQuota(source);
  if (quota) return { kind: 'quota', ...quota };
  const message =
    typeof source === 'string'
      ? source
      : source &&
          typeof source === 'object' &&
          typeof (source as { message?: unknown }).message === 'string'
        ? (source as { message: string }).message
        : errorMessage(source, status);
  if (/no ai provider/i.test(message)) return { kind: 'no_provider' };
  if (status === 429) return { kind: 'quota' };
  if (status === 404 || /for the admin|use mcp/i.test(message)) return { kind: 'unsupported' };
  if (status === 403) return { kind: 'forbidden' };
  return { kind: 'error', message };
}

/** Splits a JSON-lines stream into events, whatever the chunks. */
export function lineParser(onEvent: (event: ChatEvent) => void) {
  let buffer = '';
  const flush = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as ChatEvent);
    } catch {
      // A broken line is skipped.
    }
  };
  return {
    push(chunk: string) {
      buffer += chunk;
      let index = buffer.indexOf('\n');
      while (index >= 0) {
        flush(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf('\n');
      }
    },
    end() {
      flush(buffer);
      buffer = '';
    },
  };
}

export async function askChriss(
  api: ApiClient,
  history: ChatHistoryMessage[],
  question: string,
  onEvent: (event: ChatEvent) => void = () => {},
): Promise<ChatResult> {
  const messages: ChatHistoryMessage[] = [...history, { role: 'user', content: question }];
  let response: Response;
  try {
    response = await api.send('POST', '/assistants/chat', {
      json: { messages },
      accept: 'application/x-ndjson, application/json',
    });
  } catch {
    return { text: '', messages: null, problem: { kind: 'error', message: '' } };
  }
  if (!response.ok) {
    const text = await response.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // Plain text.
    }
    return { text: '', messages: null, problem: problemOf(data, response.status) };
  }
  let text = '';
  let done: ChatHistoryMessage[] | null = null;
  let problem: ChatProblem | null = null;
  const parser = lineParser((event) => {
    if (event.type === 'text') text = event.text;
    else if (event.type === 'done') done = event.messages;
    else if (event.type === 'error') problem = problemOf(event);
    onEvent(event);
  });
  const reader = response.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done: finished } = await reader.read();
      if (finished) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
  } else {
    parser.push(await response.text());
  }
  parser.end();
  if (!problem && !done) problem = { kind: 'error', message: '' };
  return { text, messages: problem ? null : done, problem };
}
