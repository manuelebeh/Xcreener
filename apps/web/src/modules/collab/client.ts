import type { CollabServerMessage, ParticipantPresence } from '@snapglow/collab-core';
import { COLLAB_PRESENCE_THROTTLE_MS } from '@snapglow/collab-core';
import { getCollabWsUrl } from './api';

type MessageHandler = (message: CollabServerMessage) => void;

export class CollabWebSocketClient {
  private socket: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private presenceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPresence: Omit<ParticipantPresence, 'userId' | 'email' | 'displayName' | 'color'> | null =
    null;
  private documentId: string | null = null;
  private token: string | null = null;

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  connect(documentId: string, token: string): void {
    this.documentId = documentId;
    this.token = token;
    this.openSocket();
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

  updatePresence(presence: Omit<ParticipantPresence, 'userId' | 'email' | 'displayName' | 'color'>): void {
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

  private openSocket(): void {
    if (!this.documentId || !this.token) {
      return;
    }
    const socket = new WebSocket(getCollabWsUrl());
    this.socket = socket;
    socket.addEventListener('open', () => {
      this.sendRaw({
        type: 'auth',
        token: this.token as string,
        documentId: this.documentId as string,
      });
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
      if (this.documentId && this.token) {
        this.reconnectTimer = setTimeout(() => this.openSocket(), 1500);
      }
    });
  }
}

export const collabClient = new CollabWebSocketClient();
