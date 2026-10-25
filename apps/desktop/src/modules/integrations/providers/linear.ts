interface LinearIssueSummary {
  id: string;
  identifier: string;
  title: string;
}

export async function listLinearIssues(
  accessToken: string,
  teamId: string
): Promise<LinearIssueSummary[]> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query TeamIssues($teamId: String!) {
          team(id: $teamId) {
            issues(first: 20) {
              nodes { id identifier title }
            }
          }
        }
      `,
      variables: { teamId },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to list Linear issues');
  }

  const payload = (await response.json()) as {
    data?: { team?: { issues?: { nodes?: LinearIssueSummary[] } } };
  };

  return payload.data?.team?.issues?.nodes ?? [];
}

interface LinearTeam {
  id: string;
  name: string;
}

export async function listLinearTeams(accessToken: string): Promise<LinearTeam[]> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query { teams { nodes { id name } } }`,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to list Linear teams');
  }

  const payload = (await response.json()) as {
    data?: { teams?: { nodes?: LinearTeam[] } };
  };

  return payload.data?.teams?.nodes ?? [];
}

export async function sendToLinearTeam(input: {
  accessToken: string;
  teamId: string;
  blob: Blob;
  filename: string;
  title?: string;
}): Promise<string> {
  const buffer = await input.blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const description = `![${input.filename}](data:${input.blob.type};base64,${base64})`;

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: input.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation CreateIssue($teamId: String!, $title: String!, $description: String!) {
          issueCreate(input: { teamId: $teamId, title: $title, description: $description }) {
            issue { url }
          }
        }
      `,
      variables: {
        teamId: input.teamId,
        title: input.title ?? input.filename,
        description,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Linear issue creation failed');
  }

  const payload = (await response.json()) as {
    data?: { issueCreate?: { issue?: { url?: string } } };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'Linear issue creation failed');
  }

  return payload.data?.issueCreate?.issue?.url ?? 'Sent to Linear';
}

export async function sendToLinearIssue(input: {
  accessToken: string;
  issueId: string;
  blob: Blob;
  filename: string;
  message?: string;
}): Promise<string> {
  const buffer = await input.blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const body = `${input.message ?? 'Xcreener export'}\n\n![${input.filename}](data:${input.blob.type};base64,${base64})`;

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: input.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation Comment($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            comment { url }
          }
        }
      `,
      variables: { issueId: input.issueId, body },
    }),
  });

  if (!response.ok) {
    throw new Error('Linear comment failed');
  }

  const payload = (await response.json()) as {
    data?: { commentCreate?: { comment?: { url?: string } } };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'Linear comment failed');
  }

  return payload.data?.commentCreate?.comment?.url ?? 'Comment added on Linear';
}
