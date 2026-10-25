import type { CollabServerMessage, ParticipantPresence } from '@xcreener/collab-core';
import { COLLAB_PRESENCE_THROTTLE_MS } from '@xcreener/collab-core';
import { getCollabWsUrl } from './api';

type MessageHandler = (message: CollabServerMessage) => void;

export class CollabWebSocketClient {
  private socket: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private presenceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPresence: Omit<
    ParticipantPresence,
    'userId' | 'email' | 'displayName' | 'color'
  > | null = null;
  private documentId: string | null = null;
  private getToken: (() => Promise<string | null>) | null = null;

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** `getToken` runs on every (re)connect, so a reconnect never sends an expired token. */
  connect(documentId: string, getToken: () => Promise<string | null>): void {
    this.documentId = documentId;
    this.getToken = getToken;
    void this.openSocket();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.presenceTimer) {
      clearTimeout(this.presenceTimer);
      this.presenceTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  sendRaw(payload: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  updatePresence(
    presence: Omit<ParticipantPresence, 'userId' | 'email' | 'displayName' | 'color'>
  ): void {
    this.pendingPresence = presence;
    if (this.presenceTimer) {
      return;
    }
    this.presenceTimer = setTimeout(() => {
      this.presenceTimer = null;
      if (this.pendingPresence) {
        this.sendRaw({ type: 'presence:update', presence: this.pendingPresence });
      }
    }, COLLAB_PRESENCE_THROTTLE_MS);
  }

  private async openSocket(): Promise<void> {
    const documentId = this.documentId;
    const token = documentId && this.getToken ? await this.getToken() : null;
    if (!documentId || !token) {
      return;
    }
    const socket = new WebSocket(getCollabWsUrl());
    this.socket = socket;
    socket.addEventListener('open', () => {
      this.sendRaw({ type: 'auth', token, documentId });
    });
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as CollabServerMessage;
        for (const handler of this.handlers) {
          handler(message);
        }
      } catch {
        // ignore malformed payloads
      }
    });
    socket.addEventListener('close', () => {
      if (this.documentId && this.getToken) {
        this.reconnectTimer = setTimeout(() => void this.openSocket(), 1500);
      }
    });
  }
}

export const collabClient = new CollabWebSocketClient();
