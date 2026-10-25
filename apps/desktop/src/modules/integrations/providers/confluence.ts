interface ConfluencePage {
  id: string;
  title: string;
}

export async function listConfluencePages(
  accessToken: string,
  cloudId: string
): Promise<ConfluencePage[]> {
  const response = await fetch(
    `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/content?limit=25&orderby=lastModified desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list Confluence pages');
  }

  const payload = (await response.json()) as {
    results?: Array<{ id: string; title?: string }>;
  };

  return (payload.results ?? []).map((page) => ({
    id: page.id,
    title: page.title ?? page.id,
  }));
}

export async function sendToConfluencePage(input: {
  accessToken: string;
  cloudId: string;
  pageId: string;
  blob: Blob;
  filename: string;
  caption?: string;
}): Promise<string> {
  const bytes = new Uint8Array(await input.blob.arrayBuffer());
  const base64 = btoa(String.fromCharCode(...bytes));

  const response = await fetch(
    `https://api.atlassian.com/ex/confluence/${input.cloudId}/wiki/rest/api/content/${input.pageId}/child/attachment`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
      body: JSON.stringify({
        fileName: input.filename,
        comment: input.caption ?? 'Xcreener export',
        contentType: input.blob.type || 'image/png',
        content: base64,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Confluence attachment upload failed');
  }

  return `https://api.atlassian.com/ex/confluence/${input.cloudId}/wiki/pages/viewpage.action?pageId=${input.pageId}`;
}
