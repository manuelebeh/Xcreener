interface GitHubRepo {
  id: number;
  fullName: string;
}

interface GitHubIssueSummary {
  number: number;
  title: string;
}

export async function listGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const response = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to list GitHub repositories');
  }

  const payload = (await response.json()) as Array<{ id: number; full_name: string }>;
  return payload.map((repo) => ({ id: repo.id, fullName: repo.full_name }));
}

export async function listGitHubIssues(
  accessToken: string,
  repoFullName: string
): Promise<GitHubIssueSummary[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/issues?state=open&per_page=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list GitHub issues');
  }

  const payload = (await response.json()) as Array<{
    number: number;
    title: string;
    pull_request?: unknown;
  }>;
  return payload
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({ number: issue.number, title: issue.title }));
}

export async function sendToGitHubIssue(input: {
  accessToken: string;
  repoFullName: string;
  blob: Blob;
  filename: string;
  title?: string;
  issueNumber?: number;
}): Promise<string> {
  const buffer = await input.blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const body = `${input.title ?? 'Xcreener export'}\n\n![${input.filename}](data:${input.blob.type};base64,${base64})`;

  if (input.issueNumber) {
    const response = await fetch(
      `https://api.github.com/repos/${input.repoFullName}/issues/${input.issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? 'GitHub comment failed');
    }

    const payload = (await response.json()) as { html_url?: string };
    return payload.html_url ?? 'Comment added on GitHub';
  }

  const response = await fetch(`https://api.github.com/repos/${input.repoFullName}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title ?? input.filename,
      body,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'GitHub issue creation failed');
  }

  const payload = (await response.json()) as { html_url?: string };
  return payload.html_url ?? 'Sent to GitHub';
}
