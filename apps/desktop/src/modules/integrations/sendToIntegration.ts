import type { IntegrationProvider } from '@snapglow/integrations-core';
import { INTEGRATION_LABELS } from '@snapglow/integrations-core';
import {
  listGitHubIssues as fetchGitHubIssues,
  listGitHubRepos as fetchGitHubRepos,
  sendToGitHubIssue,
} from './providers/github';
import {
  listLinearIssues as fetchLinearIssues,
  listLinearTeams as fetchLinearTeams,
  sendToLinearIssue,
  sendToLinearTeam,
} from './providers/linear';
import { listNotionPages as fetchNotionPages, sendToNotionPage } from './providers/notion';
import { listSlackChannels as fetchSlackChannels, sendToSlackChannel } from './providers/slack';
import { requireIntegrationToken } from './store';

export interface SendToProviderInput {
  provider: IntegrationProvider;
  blob: Blob;
  filename: string;
  mimeType: string;
  destinationId: string;
  destinationLabel?: string;
  secondaryDestinationId?: string;
  secondaryDestinationLabel?: string;
  message?: string;
}

export async function sendToProvider(input: SendToProviderInput): Promise<{ message: string; url?: string }> {
  const token = await requireIntegrationToken(input.provider);
  const title = input.message ?? input.filename;

  switch (input.provider) {
    case 'slack': {
      const url = await sendToSlackChannel({
        accessToken: token.accessToken,
        channelId: input.destinationId,
        blob: input.blob,
        filename: input.filename,
        title,
      });
      return { message: `Sent to ${input.destinationLabel ?? 'Slack'}`, url };
    }
    case 'notion': {
      const url = await sendToNotionPage({
        accessToken: token.accessToken,
        pageId: input.destinationId,
        blob: input.blob,
        filename: input.filename,
        caption: title,
      });
      return { message: `Sent to ${input.destinationLabel ?? 'Notion'}`, url };
    }
    case 'linear': {
      if (input.destinationId && input.secondaryDestinationId) {
        const url = await sendToLinearIssue({
          accessToken: token.accessToken,
          issueId: input.destinationId,
          blob: input.blob,
          filename: input.filename,
          message: title,
        });
        return { message: `Attached to ${input.destinationLabel ?? 'Linear issue'}`, url };
      }
      const url = await sendToLinearTeam({
        accessToken: token.accessToken,
        teamId: input.secondaryDestinationId || input.destinationId,
        blob: input.blob,
        filename: input.filename,
        title,
      });
      return { message: `Created Linear issue in ${input.destinationLabel ?? 'team'}`, url };
    }
    case 'github': {
      const repo = input.secondaryDestinationId || input.destinationId;
      const issueNumber =
        input.secondaryDestinationId && input.destinationId
          ? Number.parseInt(input.destinationId, 10)
          : undefined;
      const url = await sendToGitHubIssue({
        accessToken: token.accessToken,
        repoFullName: repo,
        blob: input.blob,
        filename: input.filename,
        title,
        issueNumber: Number.isFinite(issueNumber) ? issueNumber : undefined,
      });
      return { message: `Sent to ${input.destinationLabel ?? 'GitHub'}`, url };
    }
  }
}

export function integrationLabel(provider: IntegrationProvider): string {
  return INTEGRATION_LABELS[provider];
}

export async function listSlackChannels() {
  const token = await requireIntegrationToken('slack');
  return fetchSlackChannels(token.accessToken);
}

export async function listNotionPages() {
  const token = await requireIntegrationToken('notion');
  return fetchNotionPages(token.accessToken);
}

export async function listLinearTeams() {
  const token = await requireIntegrationToken('linear');
  return fetchLinearTeams(token.accessToken);
}

export async function listGitHubRepos() {
  const token = await requireIntegrationToken('github');
  return fetchGitHubRepos(token.accessToken);
}

export async function listLinearIssues(teamId: string) {
  const token = await requireIntegrationToken('linear');
  return fetchLinearIssues(token.accessToken, teamId);
}

export async function listGitHubIssues(repoFullName: string) {
  const token = await requireIntegrationToken('github');
  return fetchGitHubIssues(token.accessToken, repoFullName);
}
