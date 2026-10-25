import { Button, Input, Select } from '@snapglow/ui';
import { useCallback, useMemo } from 'react';
import type { StoredCapture } from '@/db/captures';
import { updateCaptureTags } from '@/db/captures';
import { addCaptureToCollection, createCollection } from '@/db/collections';
import { useDeferredDelete } from '../hooks/useDeferredDelete';
import { useHistoryLoader } from '../hooks/useHistoryLoader';
import { useOpenCapture } from '../hooks/useOpenCapture';
import { useHistoryStore } from '../store';
import { DeleteUndoToast } from './DeleteUndoToast';
import { HistoryGrid } from './HistoryGrid';
import { HistoryPreview } from './HistoryPreview';

export function HistoryView() {
  useHistoryLoader();

  const captures = useHistoryStore((s) => s.captures);
  const cloudItems = useHistoryStore((s) => s.cloudItems);
  const collections = useHistoryStore((s) => s.collections);
  const searchQuery = useHistoryStore((s) => s.searchQuery);
  const activeTag = useHistoryStore((s) => s.activeTag);
  const activeCollectionId = useHistoryStore((s) => s.activeCollectionId);
  const sourceFilter = useHistoryStore((s) => s.sourceFilter);
  const loading = useHistoryStore((s) => s.loading);
  const error = useHistoryStore((s) => s.error);
  const selectedId = useHistoryStore((s) => s.selectedId);
  const setSearchQuery = useHistoryStore((s) => s.setSearchQuery);
  const setActiveTag = useHistoryStore((s) => s.setActiveTag);
  const setActiveCollectionId = useHistoryStore((s) => s.setActiveCollectionId);
  const setSourceFilter = useHistoryStore((s) => s.setSourceFilter);
  const setSelectedId = useHistoryStore((s) => s.setSelectedId);

  const { openCapture, openingId, error: openError } = useOpenCapture();
  const { requestDelete, undoDelete, pendingCapture } = useDeferredDelete();

  const selectedCapture = useMemo(
    () => captures.find((capture) => capture.id === selectedId) ?? null,
    [captures, selectedId]
  );

  const handleOpen = useCallback(
    (id: number) => {
      void openCapture(id);
    },
    [openCapture]
  );

  const handleDelete = useCallback(
    (id: number) => {
      const capture = captures.find((item) => item.id === id);
      if (!capture) {
        return;
      }

      requestDelete(capture);
    },
    [captures, requestDelete]
  );

  const handleAddTag = useCallback(
    async (capture: StoredCapture, tag: string) => {
      if (!tag.trim()) {
        return;
      }

      const nextTags = [...new Set([...capture.tags, tag.trim()])];
      await updateCaptureTags(capture.id, nextTags);
      useHistoryStore.setState({
        captures: captures.map((item) =>
          item.id === capture.id ? { ...item, tags: nextTags } : item
        ),
      });
    },
    [captures]
  );

  const handleAddToCollection = useCallback(async (captureId: number, collectionId: number) => {
    await addCaptureToCollection(captureId, collectionId);
  }, []);

  const handleCreateCollection = useCallback(async () => {
    const name = window.prompt('Collection name');
    if (!name?.trim()) {
      return;
    }
    const created = await createCollection(name.trim());
    setActiveCollectionId(created.id);
    useHistoryStore.setState({ collections: [...collections, created] });
  }, [collections, setActiveCollectionId]);

  const hasResults = captures.length > 0 || cloudItems.length > 0;
  const showNoMatches =
    !loading && !hasResults && (searchQuery.trim() || activeTag || activeCollectionId !== null);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Library</h1>
        <p className="text-sm text-muted">
          Local history with OCR search · cloud sync when signed in.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="library-search" className="sr-only">
            Search OCR text
          </label>
          <Input
            id="library-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search captures…"
            data-testid="library-search-input"
          />
        </div>
        <div>
          <label htmlFor="library-source" className="sr-only">
            Source
          </label>
          <Select
            id="library-source"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as 'all' | 'local' | 'cloud')}
          >
            <option value="all">All sources</option>
            <option value="local">Local</option>
            <option value="cloud">Cloud</option>
          </Select>
        </div>
        <div>
          <label htmlFor="library-collection" className="sr-only">
            Collection
          </label>
          <Select
            id="library-collection"
            value={activeCollectionId ?? ''}
            onChange={(event) =>
              setActiveCollectionId(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">All collections</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void handleCreateCollection()}
        >
          New collection
        </Button>
        {activeTag ? (
          <button
            type="button"
            className="sg-focus-ring h-8 rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary"
            onClick={() => setActiveTag(null)}
          >
            Tag: {activeTag} ×
          </button>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-muted">Loading library…</p> : null}
      {error ? (
        <p className="text-sm text-destructive" data-testid="history-error">
          {error}
        </p>
      ) : null}
      {openError ? (
        <p className="text-sm text-destructive" data-testid="history-open-error">
          {openError}
        </p>
      ) : null}

      {showNoMatches ? (
        <div
          className="rounded-lg border border-dashed border-border px-6 py-10 text-center"
          data-testid="library-no-matches"
        >
          <p className="text-sm font-medium text-foreground">No matches</p>
          <p className="mt-1 text-sm text-muted">Try another query, tag, or collection filter.</p>
        </div>
      ) : null}

      {!loading && !hasResults && !showNoMatches ? (
        <div className="px-6 py-20 text-center" data-testid="history-empty">
          <p className="text-base font-semibold text-foreground">No captures yet</p>
          <p className="mt-1 text-sm text-muted">
            Use Cmd+Shift+2 (or Ctrl+Shift+2) to capture your first screenshot.
          </p>
        </div>
      ) : null}

      {captures.length > 0 ? (
        <HistoryGrid
          captures={captures}
          selectedId={selectedId}
          openingId={openingId}
          onSelect={setSelectedId}
          onOpen={handleOpen}
          onDelete={handleDelete}
          onAddTag={handleAddTag}
          collections={collections}
          onAddToCollection={handleAddToCollection}
        />
      ) : null}

      {cloudItems.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Cloud library</h2>
          <ul className="space-y-2">
            {cloudItems.map((item) => (
              <li key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
                <p className="font-medium">{item.title ?? 'Untitled'}</p>
                {item.ocrText ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{item.ocrText}</p>
                ) : null}
                <a
                  href={item.assetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-primary"
                >
                  Open asset
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <HistoryPreview
        capture={selectedCapture}
        onClose={() => setSelectedId(null)}
        onOpen={() => {
          if (selectedCapture) {
            handleOpen(selectedCapture.id);
          }
        }}
        isOpening={selectedCapture ? openingId === selectedCapture.id : false}
      />

      <DeleteUndoToast capture={pendingCapture} onUndo={undoDelete} />
    </div>
  );
}
