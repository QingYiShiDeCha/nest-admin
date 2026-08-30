import type { Redis } from 'ioredis';
import { firstValueFrom, take } from 'rxjs';

import type { RedisClient } from '../../redis/redis.constants';
import { NoticeEventService } from './notice-event.service';

type RedisEventHandler = (...args: string[]) => void;

class RedisSubscriberStub {
  readonly status = 'ready';
  readonly handlers = new Map<string, RedisEventHandler>();
  readonly disconnect = jest.fn((): void => undefined);
  subscribedChannel: string | null = null;

  subscribe(channel: string): Promise<number> {
    this.subscribedChannel = channel;
    return Promise.resolve(1);
  }

  on(event: string, handler: RedisEventHandler): this {
    this.handlers.set(event, handler);
    return this;
  }

  emitMessage(channel: string, payload: string): void {
    this.handlers.get('message')?.(channel, payload);
  }
}

class RedisPublisherStub {
  readonly status = 'ready';
  readonly subscriber = new RedisSubscriberStub();
  publishedChannel: string | null = null;
  publishedPayload: string | null = null;
  publishCount = 0;

  publish(channel: string, payload: string): Promise<number> {
    this.publishedChannel = channel;
    this.publishedPayload = payload;
    this.publishCount += 1;
    return Promise.resolve(1);
  }

  duplicate(): Redis {
    return this.subscriber as unknown as Redis;
  }
}

describe('NoticeEventService', () => {
  it('未配置 Redis 时仍能向本实例指定用户推送', async () => {
    const service = new NoticeEventService(null);
    const received = firstValueFrom(service.forUser(7).pipe(take(1)));

    await service.publishToUsers([7, 8], 'message.created', { noticeId: 3 });

    await expect(received).resolves.toMatchObject({
      type: 'message.created',
      noticeId: 3,
    });
  });

  it('Redis 模式本机立即投递，并忽略自己发布后的频道回流', async () => {
    const redis = new RedisPublisherStub();
    const service = new NoticeEventService(redis as unknown as RedisClient);
    const events: string[] = [];
    const subscription = service
      .forUser(9)
      .subscribe((event) => events.push(event.id));
    service.onModuleInit();

    await service.publishToUsers([9], 'message.read-all');
    const payload = redis.publishedPayload;
    expect(payload).toBeDefined();
    redis.subscriber.emitMessage(
      'nest-admin:notice:realtime:v1',
      payload ?? '',
    );

    expect(events).toHaveLength(1);
    expect(redis.publishCount).toBe(1);

    const remoteEnvelope = JSON.parse(payload ?? '') as { sourceId: string };
    remoteEnvelope.sourceId = 'another-instance';
    redis.subscriber.emitMessage(
      'nest-admin:notice:realtime:v1',
      JSON.stringify(remoteEnvelope),
    );
    expect(events).toHaveLength(2);

    subscription.unsubscribe();
    service.onModuleDestroy();
    expect(redis.subscriber.disconnect).toHaveBeenCalled();
  });

  it('忽略频道中的损坏消息和非目标用户', () => {
    const redis = new RedisPublisherStub();
    const service = new NoticeEventService(redis as unknown as RedisClient);
    const received = jest.fn();
    service.forUser(2).subscribe(received);
    service.onModuleInit();

    redis.subscriber.emitMessage('nest-admin:notice:realtime:v1', '{bad');
    redis.subscriber.emitMessage(
      'nest-admin:notice:realtime:v1',
      JSON.stringify({
        sourceId: 'remote',
        userIds: [3],
        event: {
          id: 'event-id',
          type: 'message.created',
          occurredAt: new Date().toISOString(),
        },
      }),
    );

    expect(received).not.toHaveBeenCalled();
  });
});
