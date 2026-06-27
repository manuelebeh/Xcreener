interface JiraIssue {
  id: string;
  key: string;
  summary: string;
}

export async function listJiraIssues(
  accessToken: string,
  cloudId: string
): Promise<JiraIssue[]> {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql?jql=order+by+updated+DESC&maxResults=25&fields=summary`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list Jira issues');
  }

  const payload = (await response.json()) as {
    issues?: Array<{ id: string; key: string; fields?: { summary?: string } }>;
  };

  return (payload.issues ?? []).map((issue) => ({
    id: issue.id,
    key: issue.key,
    summary: issue.fields?.summary ?? issue.key,
  }));
}

export async function sendToJiraIssue(input: {
  accessToken: string;
  cloudId: string;
  issueId: string;
  blob: Blob;
  filename: string;
  message?: string;
}): Promise<string> {
  const formData = new FormData();
  formData.append('file', input.blob, input.filename);

  const uploadResponse = await fetch(
    `https://api.atlassian.com/ex/jira/${input.cloudId}/rest/api/3/issue/${input.issueId}/attachments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error('Jira attachment upload failed');
  }

  if (input.message?.trim()) {
    await fetch(
      `https://api.atlassian.com/ex/jira/${input.cloudId}/rest/api/3/issue/${input.issueId}/comment`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: input.message }],
              },
            ],
          },
        }),
      }
    );
  }

  return `https://api.atlassian.com/ex/jira/${input.cloudId}/browse/${input.issueId}`;
}
