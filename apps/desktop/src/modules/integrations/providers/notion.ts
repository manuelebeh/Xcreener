interface NotionPage {
  id: string;
  title: string;
}

export async function listNotionPages(accessToken: string): Promise<NotionPage[]> {
  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: { value: 'page', property: 'object' },
      page_size: 50,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to search Notion pages');
  }

  const payload = (await response.json()) as {
    results: Array<{
      id: string;
      properties?: Record<string, { title?: Array<{ plain_text?: string }> }>;
    }>;
  };

  return payload.results.map((page) => {
    const titleProp = Object.values(page.properties ?? {}).find((prop) => prop.title);
    const title = titleProp?.title?.[0]?.plain_text ?? 'Untitled page';
    return { id: page.id, title };
  });
}

export async function sendToNotionPage(input: {
  accessToken: string;
  pageId: string;
  blob: Blob;
  filename: string;
  caption?: string;
}): Promise<string> {
  const buffer = await input.blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { page_id: input.pageId },
      properties: {
        title: {
          title: [{ text: { content: input.caption ?? input.filename } }],
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: input.caption ?? 'SnapGlow export' } }],
          },
        },
        {
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: { url: `data:${input.blob.type};base64,${base64}` },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'Notion upload failed');
  }

  const payload = (await response.json()) as { url?: string };
  return payload.url ?? 'Sent to Notion';
}
