import { convertFileSrc } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import { useEffect, useState } from 'react';

function bytesToObjectUrl(bytes: Uint8Array, mimeType: string): string {
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

/** Load a local file as an img src (asset protocol with blob fallback). */
export function useLocalFileSrc(path: string | null, mimeType: string): string | null {
  const [src, setSrc] = useState<string | null>(path ? convertFileSrc(path) : null);

  useEffect(() => {
    if (!path) {
      setSrc(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    setSrc(convertFileSrc(path));

    void readFile(path)
      .then((bytes) => {
        if (cancelled) {
          return;
        }
        objectUrl = bytesToObjectUrl(bytes, mimeType);
        setSrc(objectUrl);
      })
      .catch(() => {
        // Keep asset protocol URL if blob fallback fails.
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path, mimeType]);

  return src;
}
