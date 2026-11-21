import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './api';
import { askChriss, findQuota, lineParser, problemOf, type ChatEvent } from './chat';

function api(response: Response) {
  const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => response);
  const tokens = { accessToken: async () => 'tok', refresh: async () => undefined };
  return { client: new ApiClient('https://www.esempio.it', tokens, fetchImpl), fetchImpl };
}

function stream(lines: string[], split = 7): Response {
  const text = lines.join('\n') + '\n';
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Chunks that cut lines in half, as networks do.
      for (let i = 0; i < text.length; i += split)
        controller.enqueue(encoder.encode(text.slice(i, i + split)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'application/x-ndjson' } });
}

describe('lineParser', () => {
  it('rebuilds lines across chunks and skips broken ones', () => {
    const events: ChatEvent[] = [];
    const parser = lineParser((e) => events.push(e));
    parser.push('{"type":"pi');
    parser.push('ng"}\nnot json\n{"type":"text","te');
    parser.push('xt":"Ciao"}');
    parser.end();
    expect(events).toEqual([{ type: 'ping' }, { type: 'text', text: 'Ciao' }]);
  });
});

describe('quota errors', () => {
  it('are found at the top, wrapped, or inside a message', () => {
    expect(
      findQuota({ error: 'quota_exceeded', limit: 20, resetAt: '2026-11-22T00:00:00Z' }),
    ).toEqual({
      limit: 20,
      resetAt: '2026-11-22T00:00:00Z',
    });
    expect(findQuota({ status: 429, detail: { error: 'quota_exceeded', limit: 20 } })).toEqual({
      limit: 20,
    });
    expect(findQuota({ type: 'error', message: 'quota_exceeded' })).toEqual({});
    expect(
      findQuota({ type: 'error', message: 'Chriss base: {"error":"quota_exceeded","limit":30}' }),
    ).toEqual({ limit: 30 });
    expect(findQuota({ message: 'Something else' })).toBeNull();
  });

  it('become the quota problem, also from a bare 429', () => {
    expect(problemOf({ error: { code: 'quota_exceeded', limit: 5 } }, 429)).toEqual({
      kind: 'quota',
      limit: 5,
    });
    expect(problemOf({ message: 'Too many requests' }, 429)).toEqual({ kind: 'quota' });
  });
});

describe('problems', () => {
  it('tell apart no provider, an older site and missing rights', () => {
    expect(problemOf({ type: 'error', message: 'No AI provider is set up for the chat.' })).toEqual(
      {
        kind: 'no_provider',
      },
    );
    expect(problemOf({ message: 'The chat is for the admin: use MCP instead.' }, 403)).toEqual({
      kind: 'unsupported',
    });
    expect(problemOf({ message: 'Not Found' }, 404)).toEqual({ kind: 'unsupported' });
    expect(problemOf({ message: 'You are not allowed to do this.' }, 403)).toEqual({
      kind: 'forbidden',
    });
    expect(problemOf({ type: 'error', message: 'The AI provider answered 500.' })).toEqual({
      kind: 'error',
      message: 'The AI provider answered 500.',
    });
  });
});

describe('askChriss', () => {
  it('sends the conversation with the question and returns the answer and the new history', async () => {
    const history = [{ role: 'assistant' as const, content: 'Ciao!' }];
    const done = [
      ...history,
      { role: 'user', content: 'Scrivi una bozza' },
      { role: 'assistant', content: 'Fatto' },
    ];
    const { client, fetchImpl } = api(
      stream([
        '{"type":"ping"}',
        '{"type":"tool","name":"create_entry"}',
        '{"type":"tool-done","name":"create_entry","ok":true}',
        '{"type":"text","text":"Fatto: **bozza** creata."}',
        JSON.stringify({ type: 'done', messages: done }),
      ]),
    );
    const events: string[] = [];
    const result = await askChriss(client, history, 'Scrivi una bozza', (e) => events.push(e.type));
    expect(result).toEqual({ text: 'Fatto: **bozza** creata.', messages: done, problem: null });
    expect(events).toEqual(['ping', 'tool', 'tool-done', 'text', 'done']);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://www.esempio.it/api/v1/assistants/chat');
    expect((init!.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(init!.body as string)).toEqual({
      messages: [...history, { role: 'user', content: 'Scrivi una bozza' }],
    });
  });

  it('reports an error event in the stream', async () => {
    const { client } = api(
      stream(['{"type":"error","message":"No AI provider is set up for the chat."}']),
    );
    expect(await askChriss(client, [], 'ciao')).toEqual({
      text: '',
      messages: null,
      problem: { kind: 'no_provider' },
    });
  });

  it('reports a quota answer given as JSON', async () => {
    const { client } = api(
      new Response(
        JSON.stringify({ error: 'quota_exceeded', limit: 20, resetAt: '2026-11-22T00:00:00Z' }),
        {
          status: 429,
        },
      ),
    );
    expect((await askChriss(client, [], 'ciao')).problem).toEqual({
      kind: 'quota',
      limit: 20,
      resetAt: '2026-11-22T00:00:00Z',
    });
  });

  it('treats a stream that ends without "done" as an error', async () => {
    const { client } = api(stream(['{"type":"text","text":"mezza"}']));
    expect((await askChriss(client, [], 'ciao')).problem).toEqual({ kind: 'error', message: '' });
  });
});
