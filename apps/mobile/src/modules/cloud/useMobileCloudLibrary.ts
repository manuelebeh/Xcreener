import { useCallback, useState } from 'react';
import { fetchMobileLibrary, type MobileLibraryItem } from './api';

export function useMobileCloudLibrary(accessToken: string | null) {
  const [items, setItems] = useState<MobileLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const libraryItems = await fetchMobileLibrary(accessToken);
      setItems(libraryItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return { items, loading, error, refresh };
}
