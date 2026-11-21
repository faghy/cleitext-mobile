import { type FetchLike } from './oauth';
import type {
  CommentList,
  CommentStatus,
  EntryStatus,
  EntrySummary,
  EntryView,
  Me,
  Media,
  OrderDetail,
  OrderListItem,
  OrderStatus,
  PushDevice,
  PushStatus,
  Submission,
} from './types';
import type { CxdDocument } from './content';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The feature is not there for this person: plugin absent, no right. */
  get unavailable(): boolean {
    return this.status === 404 || this.status === 403;
  }
}

export interface AccessTokens {
  accessToken(): Promise<string>;
  refresh(): Promise<unknown>;
}

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  query?: Query;
  json?: unknown;
  body?: FormData;
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error_description', 'error', 'title']) {
      if (typeof b[key] === 'string' && b[key]) return b[key] as string;
      if (Array.isArray(b[key]) && typeof b[key][0] === 'string') return b[key][0] as string;
    }
  }
  return `HTTP ${status}`;
}

/** The REST API of one site, with its Bearer token (refreshed once on 401). */
export class ApiClient {
  constructor(
    readonly origin: string,
    private readonly tokens: AccessTokens,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {}

  url(path: string, query?: Query): string {
    const url = new URL(`/api/v1${path}`, this.origin);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  /** An address of the site (media URLs may be relative). */
  absolute(address: string): string {
    return new URL(address, this.origin).toString();
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const send = async (token: string) => {
      const headers: Record<string, string> = {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      };
      let body: BodyInit | undefined;
      if (options.json !== undefined) {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(options.json);
      } else if (options.body) {
        body = options.body;
      }
      return this.fetchImpl(this.url(path, options.query), { method, headers, body });
    };
    let response = await send(await this.tokens.accessToken());
    if (response.status === 401) {
      await this.tokens.refresh();
      response = await send(await this.tokens.accessToken());
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    let data: unknown = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!response.ok) throw new ApiError(response.status, errorMessage(data, response.status));
    return data as T;
  }

  // ---- Account -----------------------------------------------------------
  me() {
    return this.request<Me>('GET', '/auth/me');
  }

  // ---- Entries -----------------------------------------------------------
  async entries(query: { type?: string; status?: EntryStatus; limit?: number }) {
    return this.request<{ items: EntrySummary[]; nextCursor: string | null }>('GET', '/entries', {
      query,
    });
  }

  createEntry(input: {
    type: string;
    title: string;
    document: CxdDocument;
    featuredMediaId?: string;
  }) {
    return this.request<EntryView>('POST', '/entries', { json: input });
  }

  publishEntry(id: string) {
    return this.request<EntryView>('POST', `/entries/${encodeURIComponent(id)}/publish`, {
      json: { visibility: 'public' },
    });
  }

  // ---- Comments ----------------------------------------------------------
  comments(status: CommentStatus | undefined, page = 1) {
    return this.request<CommentList>('GET', '/comments', { query: { status, page } });
  }

  async pendingComments(): Promise<number> {
    return (await this.request<{ count: number }>('GET', '/comments/pending-count')).count;
  }

  setCommentStatus(ids: string[], status: CommentStatus) {
    return this.request<{ changed: number }>('POST', '/comments/status', {
      json: { ids, status },
    });
  }

  replyToComment(id: string, content: string) {
    return this.request<{ id: string }>('POST', `/comments/${encodeURIComponent(id)}/reply`, {
      json: { content },
    });
  }

  // ---- Media -------------------------------------------------------------
  media(cursor?: string) {
    return this.request<{ items: Media[]; nextCursor: string | null }>('GET', '/media', {
      query: { kind: 'image', limit: 60, cursor },
    });
  }

  upload(file: Blob, filename: string) {
    const form = new FormData();
    form.append('file', file, filename);
    return this.request<Media>('POST', '/media', { body: form });
  }

  // ---- Forms plugin ------------------------------------------------------
  submissions() {
    return this.request<Submission[]>('GET', '/ext/forms/submissions');
  }

  deleteSubmission(id: string) {
    return this.request<void>('DELETE', `/ext/forms/submissions/${encodeURIComponent(id)}`);
  }

  // ---- Shop plugin -------------------------------------------------------
  orders(query: { status?: OrderStatus; page?: number; perPage?: number } = {}) {
    return this.request<{
      items: OrderListItem[];
      total: number;
      statuses: Record<string, number>;
    }>('GET', '/ext/shop/orders', { query: { perPage: 50, ...query } });
  }

  order(id: string) {
    return this.request<OrderDetail>('GET', `/ext/shop/orders/${encodeURIComponent(id)}`);
  }

  setOrderStatus(id: string, status: OrderStatus) {
    return this.request<OrderDetail>('PATCH', `/ext/shop/orders/${encodeURIComponent(id)}/status`, {
      json: { status },
    });
  }

  // ---- Push (core ↔ app contract) ------------------------------------------
  async pushStatus(): Promise<PushStatus> {
    const raw = await this.request<{ enabled?: unknown; events?: unknown }>('GET', '/push/status');
    const events = Array.isArray(raw?.events)
      ? raw.events
          .map((e) =>
            typeof e === 'string'
              ? e
              : e && typeof e === 'object'
                ? String(
                    (e as { id?: string; event?: string }).id ?? (e as { event?: string }).event,
                  )
                : '',
          )
          .filter(Boolean)
      : [];
    return { enabled: raw?.enabled !== false, events };
  }

  registerDevice(input: { token: string; platform: 'ios' | 'android'; name?: string }) {
    return this.request<PushDevice>('POST', '/push/devices', { json: input });
  }

  devices() {
    return this.request<PushDevice[]>('GET', '/push/devices');
  }

  setDeviceEvents(id: string, events: string[]) {
    return this.request<PushDevice>('PUT', `/push/devices/${encodeURIComponent(id)}`, {
      json: { events },
    });
  }

  deleteDevice(id: string) {
    return this.request<void>('DELETE', `/push/devices/${encodeURIComponent(id)}`);
  }
}

/** Runs a request of an optional feature: null when it is not there for this person. */
export async function optional<T>(work: Promise<T>): Promise<T | null> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof ApiError && error.unavailable) return null;
    throw error;
  }
}
