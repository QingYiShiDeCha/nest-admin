import { Inject, Injectable, Logger } from '@nestjs/common';

import { REDIS_CLIENT, type RedisClient } from './redis.constants';

/**
 * 基于 Redis 的互斥锁，用来保证定时任务在多实例部署下只跑一份。
 *
 * 没配 Redis 时 acquire 直接返回 true——单实例部署本来就不需要锁，
 * 强行要求 Redis 会让本地开发和小规模部署凭空多一个依赖。
 * 代价是「多实例 + 没配 Redis」这种组合下任务会重复执行，
 * 但那种配置本身就有别的问题（限流也会失准），README 里已说明。
 */
@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  /**
   * 拿到锁则执行 task，拿不到直接跳过（不排队等待）。
   * 定时任务错过一轮没关系，下一轮还会跑；排队反而可能堆积。
   */
  async runExclusive<T>(
    key: string,
    ttlMs: number,
    task: () => Promise<T>,
  ): Promise<T | undefined> {
    if (!this.redis) {
      return task();
    }

    // 锁值用随机串，释放时校验，避免任务超时后误删别人刚拿到的锁
    const token = `${process.pid}-${Date.now()}-${Math.random()}`;
    const lockKey = `lock:${key}`;

    const acquired = await this.redis
      .set(lockKey, token, 'PX', ttlMs, 'NX')
      .catch((error: Error) => {
        this.logger.error(`获取锁 ${key} 失败：${error.message}`);
        return null;
      });

    if (acquired !== 'OK') {
      this.logger.debug(`锁 ${key} 已被其他实例持有，本轮跳过`);
      return undefined;
    }

    try {
      return await task();
    } finally {
      await this.release(lockKey, token);
    }
  }

  /**
   * 用 Lua 保证「比对值」和「删除」是原子的。
   * 分两步做的话，恰好在两步之间锁过期、被别的实例抢到，
   * 这里的 del 就会把对方的锁删掉。
   */
  private async release(lockKey: string, token: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const script =
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';

    await this.redis
      .eval(script, 1, lockKey, token)
      .catch((error: Error) =>
        this.logger.error(`释放锁 ${lockKey} 失败：${error.message}`),
      );
  }
}
