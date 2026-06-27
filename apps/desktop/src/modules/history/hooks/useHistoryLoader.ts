import { useEffect } from 'react';
import {
  listCaptures,
  listCapturesByCollection,
  listCapturesByTag,
  searchCaptures,
} from '@/db/captures';
import { listCollections } from '@/db/collections';
import { searchCloudLibrary } from '@/modules/cloud/syncLibrary';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { useHistoryStore } from '../store';

export function useHistoryLoader() {
  const searchQuery = useHistoryStore((s) => s.searchQuery);
  const activeTag = useHistoryStore((s) => s.activeTag);
  const activeCollectionId = useHistoryStore((s) => s.activeCollectionId);
  const sourceFilter = useHistoryStore((s) => s.sourceFilter);
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);

  const setCaptures = useHistoryStore((s) => s.setCaptures);
  const setCloudItems = useHistoryStore((s) => s.setCloudItems);
  const setCollections = useHistoryStore((s) => s.setCollections);
  const setLoading = useHistoryStore((s) => s.setLoading);
  const setError = useHistoryStore((s) => s.setError);

  useEffect(() => {
    void listCollections()
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [setCollections]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        let captures = searchQuery.trim()
          ? await searchCaptures(searchQuery.trim(), 30)
          : await listCaptures(30);

        if (activeTag) {
          captures = await listCapturesByTag(activeTag, 30);
        }

        if (activeCollectionId !== null) {
          captures = await listCapturesByCollection(activeCollectionId, 30);
        }

        const cloudItems =
          isAuthenticated && sourceFilter !== 'local'
            ? await searchCloudLibrary(searchQuery)
            : [];

        if (!cancelled) {
          setCaptures(sourceFilter === 'cloud' ? [] : captures);
          setCloudItems(sourceFilter === 'local' ? [] : cloudItems);
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
  }, [
    activeCollectionId,
    activeTag,
    isAuthenticated,
    searchQuery,
    setCaptures,
    setCloudItems,
    setError,
    setLoading,
    sourceFilter,
  ]);
}
