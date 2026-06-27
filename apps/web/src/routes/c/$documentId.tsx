import { createFileRoute } from '@tanstack/react-router';
import { CollabEditor } from '#/modules/collab/CollabEditor';

export const Route = createFileRoute('/c/$documentId')({
  component: CollabPage,
  head: () => ({
    meta: [{ title: 'Collaboration — SnapGlow' }, { name: 'robots', content: 'noindex' }],
  }),
});

function CollabPage() {
  const { documentId } = Route.useParams();
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-10">
      <CollabEditor documentId={documentId} />
    </main>
  );
}
