import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { users } from '@nest-admin/database';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { REDIS_CLIENT, type RedisClient } from '../../redis/redis.constants';
import { LoginLockoutPolicyService } from './login-lockout-policy.service';

/** 账号锁定检查结果，交给调用方决定如何响应 */
export interface LockoutCheck {
  locked: boolean;
  /** 离自动解锁还剩多少秒，未锁定时为 0 */
  remainingSeconds: number;
}

/**
 * 登录被锁定态拦截时抛出。单独成类，便于 auth 的 catch 块区分
 * 「被锁拦截」与「凭据错误」两种失败，分别写不同状态的登录日志。
 */
export class LoginLockedException extends UnauthorizedException {
  constructor(public readonly remainingSeconds: number) {
    super(`账号已锁定，请 ${remainingSeconds} 秒后重试`);
  }
}

const KEY_PREFIX = 'nest-admin:login';

/**
 * 账号维度登录失败计数与锁定。
 *
 * 计数走 Redis（带窗口 TTL，滑动窗口），达阈值后写 Redis 锁键 + 用户表
 * `locked_until` 落库。落库是为了跨实例一致性与管理员可见——Redis 故障时
 * 仍能凭 DB 字段判定已存在的锁；计数本身 fail-open：Redis 抖动时不阻断
 * 登录，只打日志，避免给认证链路加一个新单点。
 *
 * 与按 IP 的限流互补：IP 限流防同一来源暴力试探，账号锁定防针对单一账号
 * 的穷举。锁定时长有上限、管理员可手动解锁，缓解「用错误密码把真实账号
 * 锁死」这一拒绝服务风险。
 */
@Injectable()
export class LoginLockoutService {
  private readonly logger = new Logger(LoginLockoutService.name);
  private lastErrorLogAt = 0;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly policyService: LoginLockoutPolicyService,
  ) {}

  /**
   * 登录前置检查：账号是否处于锁定态。
   *
   * 先查 DB `locked_until`（权威，Redis 故障也成立），再看 Redis 锁键
   * （覆盖未知用户名被锁的场景——没有 user 行可落库）。
   */
  async checkLocked(
    username: string,
    user: { lockedUntil: Date | null } | null,
  ): Promise<LockoutCheck> {
    const now = Date.now();

    if (user?.lockedUntil) {
      const remainingMs = user.lockedUntil.getTime() - now;
      if (remainingMs > 0) {
        return {
          locked: true,
          remainingSeconds: Math.ceil(remainingMs / 1000),
        };
      }
    }

    if (!this.redis) {
      return { locked: false, remainingSeconds: 0 };
    }

    try {
      const ttl = await this.redis.pttl(this.lockKey(username));
      // -2 键不存在，-1 键无 TTL；这两种都视为未锁定
      if (ttl > 0) {
        return { locked: true, remainingSeconds: Math.ceil(ttl / 1000) };
      }
    } catch (error) {
      this.logRedisError('读取登录锁状态', asError(error));
    }

    return { locked: false, remainingSeconds: 0 };
  }

  /**
   * 记录一次登录失败，必要时触发锁定。
   *
   * 返回这次失败之后账号是否被锁。userId 为 null（用户名不存在）时
   * 仍计数与设 Redis 锁键，但不写 DB——没有用户行可落库；这种锁定
   * 会在 Redis TTL 后自动消失，且不保护任何真实账号，仅用于统一响应
   * 避免枚举。
   */
  async recordFailure(
    username: string,
    userId: number | null,
  ): Promise<LockoutCheck> {
    const policy = await this.policyService.resolve();

    if (!this.redis) {
      return { locked: false, remainingSeconds: 0 };
    }

    const failKey = this.failKey(username);
    let count: number;

    try {
      // INCR 后刷新窗口 TTL（滑动窗口）：每次失败都把计数再保留一个窗口
      const pipeline = this.redis.pipeline();
      pipeline.incr(failKey);
      pipeline.pexpire(failKey, policy.windowSeconds * 1000);
      const results = await pipeline.exec();
      count = (results?.[0]?.[1] as number) ?? 0;
    } catch (error) {
      this.logRedisError('记录登录失败计数', asError(error));
      // 计数失败不阻断登录流程，DB 既有锁仍由 checkLocked 兜底
      return { locked: false, remainingSeconds: 0 };
    }

    if (count < policy.maxFailures) {
      return { locked: false, remainingSeconds: 0 };
    }

    // 达阈值：设 Redis 锁键；对已知用户同步落库
    const durationMs = policy.durationSeconds * 1000;

    try {
      await this.redis.set(this.lockKey(username), '1', 'PX', durationMs);
    } catch (error) {
      this.logRedisError('写入登录锁键', asError(error));
    }

    if (userId !== null) {
      try {
        await this.db
          .update(users)
          .set({
            lockedUntil: sql`DATE_ADD(NOW(), INTERVAL ? SECOND)`,
          })
          .where(eq(users.id, userId));
      } catch (error) {
        // DB 写失败不影响 Redis 锁键的本次拦截，仅记录
        this.logger.error(
          `写入用户 ${userId} 的 locked_until 失败：${asError(error).message}`,
        );
      }
    }

    return {
      locked: true,
      remainingSeconds: policy.durationSeconds,
    };
  }

  /** 成功登录后清空该用户名的失败计数与锁键，并清除 DB 锁定标记 */
  async clearOnSuccess(username: string, userId: number): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(this.failKey(username), this.lockKey(username));
      } catch (error) {
        this.logRedisError('清除登录失败计数', asError(error));
      }
    }

    try {
      await this.db
        .update(users)
        .set({ lockedUntil: null })
        .where(eq(users.id, userId));
    } catch (error) {
      // 已登录成功，清标记失败不影响主流程
      this.logger.error(
        `清除用户 ${userId} 的 locked_until 失败：${asError(error).message}`,
      );
    }
  }

  /** 管理员手动解锁：清 Redis 计数/锁键 + 置空 DB locked_until */
  async clearLock(username: string, userId: number): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(this.failKey(username), this.lockKey(username));
      } catch (error) {
        this.logRedisError('清除登录锁键', asError(error));
      }
    }

    await this.db
      .update(users)
      .set({ lockedUntil: null })
      .where(eq(users.id, userId));
  }

  private failKey(username: string): string {
    return `${KEY_PREFIX}:fail:${username}`;
  }

  private lockKey(username: string): string {
    return `${KEY_PREFIX}:lock:${username}`;
  }

  private logRedisError(operation: string, error: Error): void {
    const now = Date.now();
    if (now - this.lastErrorLogAt < 30_000) return;
    this.lastErrorLogAt = now;
    this.logger.warn(`${operation}失败，已 fail-open：${error.message}`);
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
