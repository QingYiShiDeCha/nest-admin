import { randomUUID } from 'node:crypto';

import {
  NOTICE_REALTIME_EVENT,
  type NoticeRealtimeEvent,
  type NoticeRealtimeEventType,
} from '@nest-admin/shared';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Observable, Subject } from 'rxjs';

import { REDIS_CLIENT, type RedisClient } from '../../redis/redis.constants';

const REDIS_CHANNEL = 'nest-admin:notice:realtime:v1';
const REDIS_RECIPIENT_CHUNK_SIZE = 1_000;

interface RedisNoticeEnvelope {
  sourceId: string;
  userIds: number[];
  event: NoticeRealtimeEvent;
}

interface UserStream {
  subject: Subject<NoticeRealtimeEvent>;
  subscribers: number;
}

@Injectable()
export class NoticeEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NoticeEventService.name);
  private readonly instanceId = randomUUID();
  private readonly streams = new Map<number, UserStream>();
  private subscriber: Redis | null = null;
  private lastErrorLogAt = 0;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  onModuleInit(): void {
    if (!this.redis) {
      this.logger.log('消息实时推送：本机模式（未配置 Redis）');
      return;
    }

    const subscriber = this.redis.duplicate();
    this.subscriber = subscriber;
    subscriber.on('error', (error: Error) =>
      this.logRedisError('订阅连接异常', error),
    );
    subscriber.on('ready', () => void this.subscribeRedis(subscriber));
    subscriber.on('message', (channel, payload) => {
      if (channel === REDIS_CHANNEL) this.consumeRedisMessage(payload);
    });

    if (subscriber.status === 'ready') {
      void this.subscribeRedis(subscriber);
    }

    this.logger.log('消息实时推送：Redis Pub/Sub 多实例模式');
  }

  onModuleDestroy(): void {
    this.subscriber?.disconnect();
    this.subscriber = null;
    for (const stream of this.streams.values()) stream.subject.complete();
    this.streams.clear();
  }

  forUser(userId: number): Observable<NoticeRealtimeEvent> {
    return new Observable((observer) => {
      const stream = this.getOrCreateStream(userId);
      stream.subscribers += 1;
      const subscription = stream.subject.subscribe(observer);

      return () => {
        subscription.unsubscribe();
        stream.subscribers -= 1;
        if (stream.subscribers === 0) this.streams.delete(userId);
      };
    });
  }

  async publishToUsers(
    userIds: number[],
    type: NoticeRealtimeEventType,
    reference: Pick<NoticeRealtimeEvent, 'messageId' | 'noticeId'> = {},
  ): Promise<void> {
    const recipients = [...new Set(userIds)].filter(
      (userId) => Number.isInteger(userId) && userId > 0,
    );
    if (recipients.length === 0) return;

    const event: NoticeRealtimeEvent = {
      id: randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      ...reference,
    };

    this.emitLocal(recipients, event);

    if (!this.redis || this.redis.status !== 'ready') return;

    for (
      let offset = 0;
      offset < recipients.length;
      offset += REDIS_RECIPIENT_CHUNK_SIZE
    ) {
      const envelope: RedisNoticeEnvelope = {
        sourceId: this.instanceId,
        userIds: recipients.slice(offset, offset + REDIS_RECIPIENT_CHUNK_SIZE),
        event,
      };

      try {
        await this.redis.publish(REDIS_CHANNEL, JSON.stringify(envelope));
      } catch (error) {
        this.logRedisError('发布消息事件失败', asError(error));
        return;
      }
    }
  }

  private getOrCreateStream(userId: number): UserStream {
    const current = this.streams.get(userId);
    if (current) return current;

    const created: UserStream = {
      subject: new Subject<NoticeRealtimeEvent>(),
      subscribers: 0,
    };
    this.streams.set(userId, created);
    return created;
  }

  private emitLocal(userIds: number[], event: NoticeRealtimeEvent): void {
    for (const userId of userIds) this.streams.get(userId)?.subject.next(event);
  }

  private async subscribeRedis(subscriber: Redis): Promise<void> {
    try {
      await subscriber.subscribe(REDIS_CHANNEL);
    } catch (error) {
      this.logRedisError('订阅消息频道失败', asError(error));
    }
  }

  private consumeRedisMessage(payload: string): void {
    let value: unknown;
    try {
      value = JSON.parse(payload);
    } catch {
      return;
    }

    if (!isRedisNoticeEnvelope(value) || value.sourceId === this.instanceId) {
      return;
    }

    this.emitLocal(value.userIds, value.event);
  }

  private logRedisError(operation: string, error: Error): void {
    const now = Date.now();
    if (now - this.lastErrorLogAt < 30_000) return;
    this.lastErrorLogAt = now;
    this.logger.warn(`${operation}，本机推送仍可用：${error.message}`);
  }
}

function isRedisNoticeEnvelope(value: unknown): value is RedisNoticeEnvelope {
  if (!isRecord(value) || !isRecord(value.event)) return false;
  return (
    typeof value.sourceId === 'string' &&
    Array.isArray(value.userIds) &&
    value.userIds.every(
      (userId) =>
        typeof userId === 'number' && Number.isInteger(userId) && userId > 0,
    ) &&
    typeof value.event.id === 'string' &&
    typeof value.event.occurredAt === 'string' &&
    typeof value.event.type === 'string' &&
    NOTICE_REALTIME_EVENT.includes(
      value.event.type as NoticeRealtimeEventType,
    ) &&
    isOptionalPositiveInteger(value.event.noticeId) &&
    isOptionalPositiveInteger(value.event.messageId)
  );
}

function isOptionalPositiveInteger(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value > 0)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
