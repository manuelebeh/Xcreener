import type {
  CaptureListResponse,
  CaptureResponse,
  ExportCaptureResponse,
  ExportFormat,
  PublishCaptureResponse,
} from '@snapglow/api-core';
import type { CollabDocumentState } from '@snapglow/collab-core';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    message: string,
    readonly retryAfterSec: number,
    body?: unknown
  ) {
    super(message, 429, body);
    this.name = 'RateLimitError';
  }
}

export interface SnapGlowClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface UploadCaptureOptions {
  title?: string;
  tags?: string[];
}

export interface ListCapturesParams {
  cursor?: string;
  limit?: number;
  q?: string;
  tag?: string;
}

export interface ExportCaptureOptions {
  format?: ExportFormat;
  quality?: number;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export class SnapGlowClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SnapGlowClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'http://localhost:8787').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  captures = {
    upload: (file: Blob | File, opts?: UploadCaptureOptions) => this.uploadCapture(file, opts),
    get: (id: string) => this.getCapture(id),
    list: (params?: ListCapturesParams) => this.listCaptures(params),
    beautify: (
      id: string,
      config: CollabDocumentState,
      opts?: { title?: string; tags?: string[] }
    ) => this.beautifyCapture(id, config, opts),
    export: (id: string, opts?: ExportCaptureOptions) => this.exportCapture(id, opts),
    publish: (id: string) => this.publishCapture(id),
    delete: (id: string) => this.deleteCapture(id),
  };

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.apiKey}`);

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '60', 10);
      const body = await parseJsonResponse<unknown>(response);
      throw new RateLimitError('Rate limit exceeded', retryAfter, body);
    }

    if (!response.ok) {
      const body = await parseJsonResponse<unknown>(response);
      const message =
        body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, body);
    }

    return parseJsonResponse<T>(response);
  }

  private async uploadCapture(
    file: Blob | File,
    opts?: UploadCaptureOptions
  ): Promise<CaptureResponse> {
    const form = new FormData();
    form.append('file', file);
    if (opts?.title) {
      form.append('title', opts.title);
    }
    if (opts?.tags?.length) {
      form.append('tags', JSON.stringify(opts.tags));
    }

    return this.request<CaptureResponse>('/v1/public/captures', {
      method: 'POST',
      body: form,
    });
  }

  private async getCapture(id: string): Promise<CaptureResponse> {
    return this.request<CaptureResponse>(`/v1/public/captures/${id}`);
  }

  private async listCaptures(params?: ListCapturesParams): Promise<CaptureListResponse> {
    const search = new URLSearchParams();
    if (params?.cursor) search.set('cursor', params.cursor);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.q) search.set('q', params.q);
    if (params?.tag) search.set('tag', params.tag);
    const query = search.toString();
    return this.request<CaptureListResponse>(`/v1/public/captures${query ? `?${query}` : ''}`);
  }

  private async beautifyCapture(
    id: string,
    documentState: CollabDocumentState,
    opts?: { title?: string; tags?: string[] }
  ): Promise<CaptureResponse> {
    return this.request<CaptureResponse>(`/v1/public/captures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentState,
        title: opts?.title,
        tags: opts?.tags,
      }),
    });
  }

  private async exportCapture(
    id: string,
    opts?: ExportCaptureOptions
  ): Promise<ExportCaptureResponse> {
    return this.request<ExportCaptureResponse>(`/v1/public/captures/${id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: opts?.format ?? 'png',
        quality: opts?.quality,
      }),
    });
  }

  private async publishCapture(id: string): Promise<PublishCaptureResponse> {
    return this.request<PublishCaptureResponse>(`/v1/public/captures/${id}/publish`, {
      method: 'POST',
    });
  }

  private async deleteCapture(id: string): Promise<void> {
    await this.request<void>(`/v1/public/captures/${id}`, { method: 'DELETE' });
  }
}
