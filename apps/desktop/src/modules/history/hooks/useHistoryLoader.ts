import { useEffect } from 'react';
import { listCaptures } from '@/db/captures';
import { useHistoryStore } from '../store';

export function useHistoryLoader() {
  const setCaptures = useHistoryStore((s) => s.setCaptures);
  const setLoading = useHistoryStore((s) => s.setLoading);
  const setError = useHistoryStore((s) => s.setError);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const captures = await listCaptures(30);
        if (!cancelled) {
          setCaptures(captures);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [setCaptures, setError, setLoading]);
}
