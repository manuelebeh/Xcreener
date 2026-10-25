interface TeamsChannel {
  id: string;
  name: string;
  teamId: string;
}

export async function listTeamsChannels(accessToken: string): Promise<TeamsChannel[]> {
  const teamsResponse = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!teamsResponse.ok) {
    throw new Error('Failed to list Teams');
  }

  const teamsPayload = (await teamsResponse.json()) as {
    value?: Array<{ id: string; displayName?: string }>;
  };

  const channels: TeamsChannel[] = [];
  for (const team of teamsPayload.value ?? []) {
    const channelsResponse = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${team.id}/channels`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!channelsResponse.ok) {
      continue;
    }
    const channelsPayload = (await channelsResponse.json()) as {
      value?: Array<{ id: string; displayName?: string }>;
    };
    for (const channel of channelsPayload.value ?? []) {
      channels.push({
        id: channel.id,
        name: `${team.displayName ?? 'Team'} / ${channel.displayName ?? channel.id}`,
        teamId: team.id,
      });
    }
  }

  return channels;
}

export async function sendToTeamsChannel(input: {
  accessToken: string;
  teamId: string;
  channelId: string;
  blob: Blob;
  filename: string;
  message?: string;
}): Promise<string> {
  const content = input.message ?? `Xcreener export: ${input.filename}`;

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/teams/${input.teamId}/channels/${input.channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: { content },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Teams message post failed');
  }

  const payload = (await response.json()) as { webUrl?: string };
  return payload.webUrl ?? 'Sent to Microsoft Teams';
}
