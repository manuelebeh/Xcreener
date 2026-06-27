import { Button, Input } from '@snapglow/ui';
import { useState } from 'react';
import type { StoredCollection } from '@/db/collections';

interface CollectionsSidebarProps {
  collections: StoredCollection[];
  activeCollectionId: number | null;
  activeTag: string | null;
  onSelectCollection: (id: number) => void;
  onSelectTag: (tag: string) => void;
  onClearFilters: () => void;
  onCreateCollection: (name: string) => Promise<void>;
}

const QUICK_TAGS = ['bug', 'design', 'docs', 'release'];

export function CollectionsSidebar({
  collections,
  activeCollectionId,
  activeTag,
  onSelectCollection,
  onSelectTag,
  onClearFilters,
  onCreateCollection,
}: CollectionsSidebarProps) {
  const [draftName, setDraftName] = useState('');

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-56">
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Collections</p>
          {(activeCollectionId !== null || activeTag) && (
            <button
              type="button"
              className="text-xs text-primary"
              onClick={onClearFilters}
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-2 space-y-1">
          {collections.length === 0 ? (
            <p className="text-xs text-muted">No collections yet.</p>
          ) : (
            collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                className={`sg-focus-ring block w-full rounded-md px-2 py-1.5 text-left text-xs ${
                  activeCollectionId === collection.id
                    ? 'bg-primary/10 font-medium text-foreground'
                    : 'text-muted hover:bg-muted/30 hover:text-foreground'
                }`}
                onClick={() => onSelectCollection(collection.id)}
              >
                {collection.name}
              </button>
            ))
          )}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = draftName.trim();
            if (!name) {
              return;
            }
            void onCreateCollection(name).then(() => setDraftName(''));
          }}
        >
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="New collection"
            className="text-xs"
          />
          <Button type="submit" size="sm" variant="secondary">
            Add
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="text-sm font-medium text-foreground">Tags</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeTag === tag
                  ? 'bg-primary/15 font-medium text-foreground'
                  : 'bg-muted/30 text-muted hover:text-foreground'
              }`}
              onClick={() => onSelectTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
