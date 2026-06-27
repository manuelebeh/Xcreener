interface SlackChannel {
  id: string;
  name: string;
}

export async function listSlackChannels(accessToken: string): Promise<SlackChannel[]> {
  const response = await fetch(
    'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const payload = (await response.json()) as {
    ok: boolean;
    channels?: Array<{ id: string; name: string }>;
    error?: string;
  };

  if (!payload.ok || !payload.channels) {
    throw new Error(payload.error ?? 'Failed to list Slack channels');
  }

  return payload.channels.map((channel) => ({ id: channel.id, name: channel.name }));
}

export async function sendToSlackChannel(input: {
  accessToken: string;
  channelId: string;
  blob: Blob;
  filename: string;
  title?: string;
}): Promise<string> {
  const formData = new FormData();
  formData.append('file', input.blob, input.filename);
  formData.append('channels', input.channelId);
  if (input.title) {
    formData.append('initial_comment', input.title);
  }

  const uploadResponse = await fetch('https://slack.com/api/files.upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: formData,
  });

  const uploadPayload = (await uploadResponse.json()) as {
    ok: boolean;
    file?: { permalink?: string };
    error?: string;
  };

  if (!uploadPayload.ok) {
    throw new Error(uploadPayload.error ?? 'Slack upload failed');
  }

  return uploadPayload.file?.permalink ?? 'Sent to Slack';
}
