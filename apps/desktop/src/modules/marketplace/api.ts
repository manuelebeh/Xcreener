import type { TemplateListResponse, TemplateListingResponse } from '@snapglow/marketplace-core';
import { getApiUrl } from '@/modules/cloud/config';

export async function fetchMarketplaceTemplates(): Promise<TemplateListResponse> {
  const response = await fetch(`${getApiUrl()}/v1/templates?limit=48`);
  if (!response.ok) {
    throw new Error(`Failed to load templates (${response.status})`);
  }
  return response.json() as Promise<TemplateListResponse>;
}

export async function fetchMarketplaceTemplate(slug: string): Promise<TemplateListingResponse> {
  const response = await fetch(`${getApiUrl()}/v1/templates/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`Template not found (${response.status})`);
  }
  return response.json() as Promise<TemplateListingResponse>;
}
