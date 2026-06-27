import type { CollabServerMessage, ParticipantPresence } from '@snapglow/collab-core';
import { COLLAB_PRESENCE_THROTTLE_MS } from '@snapglow/collab-core';
import { getCollabWsUrl } from './api';

type MessageHandler = (message: CollabServerMessage) => void;
type ConnectionHandler = (state: 'connected' | 'disconnected' | 'reconnecting') => void;

export class CollabWebSocketClient {
  private socket: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
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

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  private emitConnection(state: 'connected' | 'disconnected' | 'reconnecting'): void {
    for (const handler of this.connectionHandlers) {
      handler(state);
    }
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

  updatePresence(presence: Omit<ParticipantPresence, 'userId' | 'email' | 'displayName' | 'color'>): void {
    this.pendingPresence = presence;
    if (this.presenceTimer) {
      return;
    }
    this.presenceTimer = setTimeout(() => {
      this.presenceTimer = null;
      if (this.pendingPresence) {
        this.send({ type: 'presence:update', presence: this.pendingPresence });
      }
    }, COLLAB_PRESENCE_THROTTLE_MS);
  }

  sendRaw(payload: Record<string, unknown>): void {
    this.send(payload);
  }

  private openSocket(): void {
    if (!this.documentId || !this.token) {
      return;
    }

    const socket = new WebSocket(getCollabWsUrl());
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.send({
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
      this.emitConnection('disconnected');
      if (this.documentId && this.token) {
        this.emitConnection('reconnecting');
        this.reconnectTimer = setTimeout(() => this.openSocket(), 1500);
      }
    });
  }

  private send(payload: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}

export const collabClient = new CollabWebSocketClient();
