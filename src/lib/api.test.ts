import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, optional } from './api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function client(responses: Response[], token = 'tok') {
  const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => responses.shift()!);
  let current = token;
  const tokens = {
    accessToken: vi.fn(async () => current),
    refresh: vi.fn(async () => {
      current = 'fresh';
    }),
  };
  return { api: new ApiClient('https://www.esempio.it', tokens, fetchImpl), fetchImpl, tokens };
}

describe('ApiClient', () => {
  it('sends the Bearer token to /api/v1 with JSON bodies', async () => {
    const { api, fetchImpl } = client([json({ changed: 1 })]);
    await api.setCommentStatus(['c1'], 'approved');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://www.esempio.it/api/v1/comments/status');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({ ids: ['c1'], status: 'approved' });
  });

  it('adds the query, leaving out empty values', async () => {
    const { api, fetchImpl } = client([json({ items: [], total: 0, statuses: {} })]);
    await api.orders({ status: 'processing' });
    expect(fetchImpl.mock.calls[0]![0]).toBe(
      'https://www.esempio.it/api/v1/ext/shop/orders?perPage=50&status=processing',
    );
  });

  it('refreshes once on 401 and repeats the request', async () => {
    const { api, fetchImpl, tokens } = client([json({}, 401), json({ count: 3 })]);
    expect(await api.pendingComments()).toBe(3);
    expect(tokens.refresh).toHaveBeenCalledTimes(1);
    const second = fetchImpl.mock.calls[1] as unknown as [string, RequestInit];
    expect((second[1].headers as Record<string, string>).authorization).toBe('Bearer fresh');
  });

  it('turns problems into ApiError with the server message', async () => {
    const { api } = client([json({ detail: 'This order does not exist.' }, 404)]);
    const error = await api.order('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).message).toBe('This order does not exist.');
    expect((error as ApiError).unavailable).toBe(true);
  });

  it('optional() hides features that are not there (404/403) but not other errors', async () => {
    expect(await optional(Promise.reject(new ApiError(404, 'x')))).toBeNull();
    expect(await optional(Promise.reject(new ApiError(403, 'x')))).toBeNull();
    await expect(optional(Promise.reject(new ApiError(500, 'x')))).rejects.toBeInstanceOf(ApiError);
  });

  it('uploads media as multipart with a single file field', async () => {
    const { api, fetchImpl } = client([json({ id: 'm1', url: '/uploads/a.jpg' }, 201)]);
    await api.upload(new Blob(['x'], { type: 'image/jpeg' }), 'foto.jpg');
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect((body.get('file') as File).name).toBe('foto.jpg');
    expect((init.headers as Record<string, string>)['content-type']).toBeUndefined();
  });

  it('accepts 204 answers and resolves relative media addresses', async () => {
    const { api } = client([new Response(null, { status: 204 })]);
    await expect(api.deleteDevice('d1')).resolves.toBeUndefined();
    expect(api.absolute('/uploads/a.jpg')).toBe('https://www.esempio.it/uploads/a.jpg');
  });

  it('normalises the push status', async () => {
    const { api } = client([
      json({ enabled: true, events: [{ id: 'comment.pending' }, 'shop.order'] }),
    ]);
    expect(await api.pushStatus()).toEqual({
      enabled: true,
      events: ['comment.pending', 'shop.order'],
    });
  });
});
