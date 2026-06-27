export type ShareExpiry = '1h' | '24h' | '7d' | 'permanent';

export const SHARE_EXPIRY_OPTIONS: ShareExpiry[] = ['1h', '24h', '7d', 'permanent'];

export const SHARE_EXPIRY_LABELS: Record<ShareExpiry, string> = {
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  permanent: 'Permanent',
};

export const ALLOWED_SHARE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
] as const;

export type ShareMimeType = (typeof ALLOWED_SHARE_MIME_TYPES)[number];

export const MAX_SHARE_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_SHARE_VIDEO_BYTES = 100 * 1024 * 1024;

export interface CreateShareResponse {
  token: string;
  url: string;
  expiresAt: string | null;
}

export interface PublicShareResponse {
  token: string;
  mimeType: ShareMimeType;
  byteSize: number;
  expiresAt: string | null;
  assetUrl: string;
}

export function isShareExpiry(value: string): value is ShareExpiry {
  return (SHARE_EXPIRY_OPTIONS as readonly string[]).includes(value);
}

export function computeExpiresAt(expiresIn: ShareExpiry, now = new Date()): Date | null {
  const base = now.getTime();
  switch (expiresIn) {
    case '1h':
      return new Date(base + 60 * 60 * 1000);
    case '24h':
      return new Date(base + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(base + 7 * 24 * 60 * 60 * 1000);
    case 'permanent':
      return null;
  }
}

export function isShareExpired(expiresAt: Date | null, now = new Date()): boolean {
  if (expiresAt === null) {
    return false;
  }
  return expiresAt.getTime() <= now.getTime();
}

export function maxBytesForMime(mimeType: ShareMimeType): number {
  return mimeType === 'video/mp4' ? MAX_SHARE_VIDEO_BYTES : MAX_SHARE_IMAGE_BYTES;
}

export const ALLOWED_LIBRARY_MIME_TYPES = ALLOWED_SHARE_MIME_TYPES;
export type LibraryMimeType = ShareMimeType;

export const MAX_LIBRARY_ITEM_BYTES = MAX_SHARE_IMAGE_BYTES;

export interface LibraryItemResponse {
  id: string;
  title: string | null;
  mimeType: string;
  byteSize: number;
  ocrText: string | null;
  tags: string[];
  localId: string | null;
  collectionIds: string[];
  assetUrl: string;
  createdAt: string;
}

export interface CreateLibraryItemResponse {
  id: string;
  localId: string | null;
  createdAt: string;
}

export interface LibrarySearchResponse {
  items: LibraryItemResponse[];
  total: number;
}

export interface CollectionResponse {
  id: string;
  name: string;
  createdAt: string;
  itemCount: number;
}

export interface CreateCollectionResponse {
  id: string;
  name: string;
  createdAt: string;
}

export function maxBytesForLibraryMime(mimeType: LibraryMimeType): number {
  return maxBytesForMime(mimeType);
}
