import type { TemplateListingResponse, TemplateListResponse } from '@snapglow/marketplace-core';

function getApiUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  return process.env.API_URL ?? 'http://localhost:8787';
}

export async function fetchTemplateList(params?: {
  tag?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<TemplateListResponse> {
  const url = new URL(`${getApiUrl()}/v1/templates`);
  if (params?.tag) url.searchParams.set('tag', params.tag);
  if (params?.featured) url.searchParams.set('featured', 'true');
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.offset) url.searchParams.set('offset', String(params.offset));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to load templates (${response.status})`);
  }
  return response.json() as Promise<TemplateListResponse>;
}

export async function fetchTemplateBySlug(slug: string): Promise<TemplateListingResponse> {
  const response = await fetch(`${getApiUrl()}/v1/templates/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`Template not found (${response.status})`);
  }
  return response.json() as Promise<TemplateListingResponse>;
}
