const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export interface MobileLibraryItem {
  id: string;
  title: string | null;
  mimeType: string;
  assetUrl: string;
  createdAt: string;
}

export async function fetchMobileLibrary(accessToken: string): Promise<MobileLibraryItem[]> {
  const response = await fetch(`${API_URL}/v1/sync/library`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Library sync failed (${response.status})`);
  }

  const payload = (await response.json()) as { items: MobileLibraryItem[] };
  return payload.items.filter((item) => !('deletedAt' in item && item.deletedAt));
}
