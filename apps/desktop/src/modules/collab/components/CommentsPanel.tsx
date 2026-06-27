import { Button } from '@snapglow/ui';
import { useState } from 'react';
import { createComment } from '../api';
import { useCollabStore } from '../store';

export function CommentsPanel() {
  const documentId = useCollabStore((s) => s.documentId);
  const comments = useCollabStore((s) => s.comments);
  const commentMode = useCollabStore((s) => s.commentMode);
  const pendingAnchor = useCollabStore((s) => s.pendingAnchor);
  const setCommentMode = useCollabStore((s) => s.setCommentMode);
  const setPendingAnchor = useCollabStore((s) => s.setPendingAnchor);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!documentId) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">Comments</h3>
        <Button
          type="button"
          size="sm"
          variant={commentMode ? 'primary' : 'secondary'}
          onClick={() => setCommentMode(!commentMode)}
        >
          {commentMode ? 'Cancel pin' : 'Pin comment'}
        </Button>
      </div>

      <textarea
        className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Add a comment… Use @email@company.com to mention"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      {pendingAnchor ? (
        <p className="text-xs text-muted">
          Pinned at ({Math.round(pendingAnchor.x * 100)}%, {Math.round(pendingAnchor.y * 100)}%)
        </p>
      ) : null}
      <Button
        type="button"
        disabled={!body.trim() || submitting}
        onClick={() => {
          setSubmitting(true);
          setError(null);
          void createComment(documentId, {
            body: body.trim(),
            anchor: pendingAnchor,
          })
            .then(() => {
              setBody('');
              setPendingAnchor(null);
              setCommentMode(false);
            })
            .catch((commentError) => {
              setError(
                commentError instanceof Error ? commentError.message : 'Failed to post comment'
              );
            })
            .finally(() => setSubmitting(false));
        }}
      >
        Post comment
      </Button>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {comments.length === 0 ? (
          <li className="text-xs text-muted">No comments yet — pin one on the canvas or post above.</li>
        ) : null}
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-md border border-border/70 px-3 py-2 text-sm">
            <p className="text-xs text-muted">{comment.userEmail ?? 'Teammate'}</p>
            <p className="text-foreground">{comment.body}</p>
            {comment.anchor ? (
              <p className="text-xs text-muted">
                Pin ({Math.round(comment.anchor.x * 100)}%, {Math.round(comment.anchor.y * 100)}%)
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
