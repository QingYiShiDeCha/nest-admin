import { loginLogs, operationLogs, refreshTokens } from '@nest-admin/database';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { and, isNotNull, lt, or, sql } from 'drizzle-orm';
import { CronJob } from 'cron';

import type { Env } from '../../config/env.validation';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { RedisLockService } from '../../redis/redis-lock.service';

/** 单批删除行数。太小则往返次数多，太大则单条语句持锁时间长 */
const BATCH_SIZE = 1000;

/** 单次任务最多删多少批，防止一次跑太久占着连接 */
const MAX_BATCHES = 100;

const LOCK_KEY = 'cleanup:logs';
const LOCK_TTL_MS = 10 * 60 * 1000;

export interface CleanupResult {
  loginLogs: number;
  operationLogs: number;
  refreshTokens: number;
}

@Injectable()
export class LogCleanupService implements OnModuleInit {
  private readonly logger = new Logger(LogCleanupService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService<Env, true>,
    private readonly scheduler: SchedulerRegistry,
    private readonly lock: RedisLockService,
  ) {}

  /**
   * cron 表达式来自环境变量，所以用 SchedulerRegistry 动态注册，
   * 而不是 @Cron() 装饰器——装饰器的参数在类定义时求值，那会儿读不到配置。
   */
  onModuleInit(): void {
    if (!this.config.get('LOG_CLEANUP_ENABLED', { infer: true })) {
      this.logger.log('日志定时清理已关闭');
      return;
    }

    const expression = this.config.get('LOG_CLEANUP_CRON', { infer: true });
    const job = new CronJob(expression, () => {
      void this.runScheduled();
    });

    this.scheduler.addCronJob('log-cleanup', job);
    job.start();

    this.logger.log(
      `日志清理已排程：${expression}，保留 ${this.config.get('LOG_RETENTION_DAYS', { infer: true })} 天`,
    );
  }

  /** 定时入口。多实例下靠 Redis 锁保证同一时刻只有一个实例真的在删 */
  private async runScheduled(): Promise<void> {
    const result = await this.lock.runExclusive(LOCK_KEY, LOCK_TTL_MS, () =>
      this.cleanup(),
    );

    if (!result) {
      return;
    }

    this.logger.log(
      `定时清理完成：登录日志 ${result.loginLogs} 行，操作日志 ${result.operationLogs} 行，失效会话 ${result.refreshTokens} 行`,
    );
  }

  /**
   * 手动触发也走同一把锁，避免和定时任务撞在一起同时删。
   */
  async runManually(): Promise<CleanupResult> {
    const result = await this.lock.runExclusive(LOCK_KEY, LOCK_TTL_MS, () =>
      this.cleanup(),
    );

    return result ?? { loginLogs: 0, operationLogs: 0, refreshTokens: 0 };
  }

  private async cleanup(): Promise<CleanupResult> {
    const days = this.config.get('LOG_RETENTION_DAYS', { infer: true });
    const cutoff = new Date(Date.now() - days * 86_400_000);

    return {
      loginLogs: await this.deleteInBatches('登录日志', () =>
        this.db
          .delete(loginLogs)
          .where(lt(loginLogs.createdAt, cutoff))
          .limit(BATCH_SIZE),
      ),
      operationLogs: await this.deleteInBatches('操作日志', () =>
        this.db
          .delete(operationLogs)
          .where(lt(operationLogs.createdAt, cutoff))
          .limit(BATCH_SIZE),
      ),
      // 顺带清掉已经没用的会话记录：过期的，或已吊销且超过保留期的。
      // RefreshTokenService 只在签发时清理当前用户的过期记录，
      // 已吊销但未过期、以及不再登录的用户留下的行不会被碰到。
      refreshTokens: await this.deleteInBatches('失效会话', () =>
        this.db
          .delete(refreshTokens)
          .where(
            or(
              lt(refreshTokens.expiresAt, new Date()),
              and(
                isNotNull(refreshTokens.revokedAt),
                lt(refreshTokens.revokedAt, cutoff),
              ),
            ),
          )
          .limit(BATCH_SIZE),
      ),
    };
  }

  /**
   * 分批删除。一条 `DELETE WHERE created_at < ?` 打在几百万行上会长时间持锁、
   * 撑爆 undo 和 binlog，线上表现就是整个库卡住。
   * 拆成每批 1000 行，批与批之间让出连接，慢一点但不会影响在线请求。
   */
  private async deleteInBatches(
    label: string,
    deleteBatch: () => Promise<unknown>,
  ): Promise<number> {
    let total = 0;

    for (let i = 0; i < MAX_BATCHES; i++) {
      const result = (await deleteBatch()) as [{ affectedRows: number }];
      const affected = result[0]?.affectedRows ?? 0;

      total += affected;

      if (affected < BATCH_SIZE) {
        return total;
      }
    }

    this.logger.warn(
      `${label}达到单次上限（${MAX_BATCHES * BATCH_SIZE} 行），剩余部分留到下一轮`,
    );

    return total;
  }

  /** 当前待清理的行数，供接口预览「这次会删多少」 */
  async countExpired(): Promise<CleanupResult> {
    const days = this.config.get('LOG_RETENTION_DAYS', { infer: true });
    const cutoff = new Date(Date.now() - days * 86_400_000);

    const [loginLogRows] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(loginLogs)
      .where(lt(loginLogs.createdAt, cutoff));

    const [logs] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(operationLogs)
      .where(lt(operationLogs.createdAt, cutoff));

    const [tokens] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(refreshTokens)
      .where(
        or(
          lt(refreshTokens.expiresAt, new Date()),
          and(
            isNotNull(refreshTokens.revokedAt),
            lt(refreshTokens.revokedAt, cutoff),
          ),
        ),
      );

    return {
      loginLogs: Number(loginLogRows?.n ?? 0),
      operationLogs: Number(logs?.n ?? 0),
      refreshTokens: Number(tokens?.n ?? 0),
    };
  }
}
