import type { CollabServerMessage, ParticipantPresence } from '@snapglow/collab-core';
import { COLLAB_PRESENCE_TTL_SECONDS } from '@snapglow/collab-core';
import type Redis from 'ioredis';
import { getRedis } from './redis';

function roomChannel(documentId: string): string {
  return `collab:room:${documentId}`;
}

function presenceKey(documentId: string): string {
  return `collab:presence:${documentId}`;
}

function connectionKey(userId: string): string {
  return `collab:connections:${userId}`;
}

export class CollabRoomHub {
  private subscriber: Redis | null = null;
  private readonly listeners = new Map<string, Set<(message: CollabServerMessage) => void>>();

  async subscribe(
    documentId: string,
    listener: (message: CollabServerMessage) => void
  ): Promise<() => Promise<void>> {
    if (!this.subscriber) {
      const redis = getRedis();
      this.subscriber = redis.duplicate();
      await this.subscriber.connect();
      this.subscriber.on('message', (channel, payload) => {
        const documentIdFromChannel = channel.replace('collab:room:', '');
        const listeners = this.listeners.get(documentIdFromChannel);
        if (!listeners) {
          return;
        }
        try {
          const message = JSON.parse(payload) as CollabServerMessage;
          for (const handler of listeners) {
            handler(message);
          }
        } catch {
          // ignore malformed payloads
        }
      });
    }

    const channel = roomChannel(documentId);
    let set = this.listeners.get(documentId);
    if (!set) {
      set = new Set();
      this.listeners.set(documentId, set);
      await this.subscriber.subscribe(channel);
    }
    set.add(listener);

    return async () => {
      const current = this.listeners.get(documentId);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(documentId);
        await this.subscriber?.unsubscribe(channel);
      }
    };
  }

  async publish(documentId: string, message: CollabServerMessage): Promise<void> {
    const redis = getRedis();
    await redis.publish(roomChannel(documentId), JSON.stringify(message));
  }

  async setPresence(
    documentId: string,
    userId: string,
    payload: ParticipantPresence
  ): Promise<void> {
    const redis = getRedis();
    await redis.hset(presenceKey(documentId), userId, JSON.stringify(payload));
    await redis.expire(presenceKey(documentId), COLLAB_PRESENCE_TTL_SECONDS);
  }

  async removePresence(documentId: string, userId: string): Promise<void> {
    const redis = getRedis();
    await redis.hdel(presenceKey(documentId), userId);
  }

  async listPresence(documentId: string): Promise<Record<string, string>> {
    const redis = getRedis();
    return redis.hgetall(presenceKey(documentId));
  }

  async trackConnection(userId: string): Promise<number> {
    const redis = getRedis();
    const key = connectionKey(userId);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 3600);
    }
    return count;
  }

  async untrackConnection(userId: string): Promise<void> {
    const redis = getRedis();
    const key = connectionKey(userId);
    const count = await redis.decr(key);
    if (count <= 0) {
      await redis.del(key);
    }
  }

  async isConnectionLimited(userId: string, limit = 10): Promise<boolean> {
    const redis = getRedis();
    const count = await redis.get(connectionKey(userId));
    return Number(count ?? 0) >= limit;
  }
}

export const collabRoomHub = new CollabRoomHub();
