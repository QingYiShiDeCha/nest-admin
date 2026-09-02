import {
  refreshTokens,
  scheduledTaskLogs,
  scheduledTasks,
} from '@nest-admin/database';
import type {
  SystemMonitorMetric,
  SystemMonitorOverview,
  SystemServiceProbe,
} from '@nest-admin/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, eq, gt, isNull, sql } from 'drizzle-orm';
import * as os from 'node:os';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { REDIS_CLIENT, type RedisClient } from '../../redis/redis.constants';

const HISTORY_LIMIT = 20;

interface CpuSnapshot {
  usage: NodeJS.CpuUsage;
  at: bigint;
}

@Injectable()
export class SystemMonitorService {
  private readonly logger = new Logger(SystemMonitorService.name);
  private readonly history: SystemMonitorMetric[] = [];
  private previousCpu: CpuSnapshot = {
    usage: process.cpuUsage(),
    at: process.hrtime.bigint(),
  };

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {}

  async overview(): Promise<SystemMonitorOverview> {
    const generatedAt = new Date();
    const [database, redis] = await Promise.all([
      this.probeDatabase(),
      this.probeRedis(),
    ]);
    const workload =
      database.status === 'up' ? await this.loadWorkload() : null;
    const processInfo = this.readProcessInfo();
    const hostTotalMemory = os.totalmem();
    const hostFreeMemory = os.freemem();
    const metric: SystemMonitorMetric = {
      timestamp: generatedAt.toISOString(),
      cpuUsagePercent: processInfo.cpuUsagePercent,
      heapUsagePercent:
        processInfo.heapTotalBytes === 0
          ? 0
          : roundPercent(
              (processInfo.heapUsedBytes / processInfo.heapTotalBytes) * 100,
            ),
      hostMemoryUsagePercent: roundPercent(
        ((hostTotalMemory - hostFreeMemory) / hostTotalMemory) * 100,
      ),
    };

    this.history.push(metric);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();

    return {
      generatedAt: generatedAt.toISOString(),
      host: {
        hostname: os.hostname(),
        platform: `${os.platform()} ${os.release()}`,
        arch: os.arch(),
        cpuCount: os.cpus().length,
        uptimeSeconds: Math.floor(os.uptime()),
        totalMemoryBytes: hostTotalMemory,
        freeMemoryBytes: hostFreeMemory,
      },
      process: processInfo,
      services: { database, redis },
      workload: workload ?? {
        onlineSessions: null,
        scheduledTasks: null,
        activeScheduledTasks: null,
        runningTaskExecutions: null,
      },
      history: [...this.history],
    };
  }

  private async probeDatabase(): Promise<SystemServiceProbe> {
    const startedAt = performance.now();

    try {
      await this.db.execute(sql`select 1`);
      return { status: 'up', latencyMs: elapsedMilliseconds(startedAt) };
    } catch (error) {
      this.logger.warn(
        `监控探测数据库失败：${error instanceof Error ? error.message : String(error)}`,
      );
      return { status: 'down', latencyMs: null };
    }
  }

  private async probeRedis(): Promise<SystemServiceProbe> {
    if (!this.redis) return { status: 'unconfigured', latencyMs: null };

    const startedAt = performance.now();
    try {
      await this.redis.ping();
      return { status: 'up', latencyMs: elapsedMilliseconds(startedAt) };
    } catch (error) {
      this.logger.warn(
        `监控探测 Redis 失败：${error instanceof Error ? error.message : String(error)}`,
      );
      return { status: 'down', latencyMs: null };
    }
  }

  private async loadWorkload(): Promise<{
    onlineSessions: number | null;
    scheduledTasks: number | null;
    activeScheduledTasks: number | null;
    runningTaskExecutions: number | null;
  }> {
    const [onlineSessions, scheduledTaskCounts, runningTaskExecutions] =
      await Promise.all([
        this.countSafely(() =>
          this.db
            .select({ total: count() })
            .from(refreshTokens)
            .where(
              and(
                isNull(refreshTokens.revokedAt),
                gt(refreshTokens.expiresAt, new Date()),
              ),
            ),
        ),
        this.countTasks(),
        this.countSafely(() =>
          this.db
            .select({ total: count() })
            .from(scheduledTaskLogs)
            .where(eq(scheduledTaskLogs.status, 'running')),
        ),
      ]);

    return {
      onlineSessions,
      scheduledTasks: scheduledTaskCounts?.total ?? null,
      activeScheduledTasks: scheduledTaskCounts?.active ?? null,
      runningTaskExecutions,
    };
  }

  private async countTasks(): Promise<{
    total: number;
    active: number;
  } | null> {
    try {
      const [totalResult, activeResult] = await Promise.all([
        this.db
          .select({ total: count() })
          .from(scheduledTasks)
          .where(isNull(scheduledTasks.deletedAt)),
        this.db
          .select({ total: count() })
          .from(scheduledTasks)
          .where(
            and(
              isNull(scheduledTasks.deletedAt),
              eq(scheduledTasks.status, 'active'),
            ),
          ),
      ]);
      return {
        total: totalResult[0]?.total ?? 0,
        active: activeResult[0]?.total ?? 0,
      };
    } catch (error) {
      this.logger.warn(
        `监控统计定时任务失败：${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async countSafely(
    query: () => Promise<Array<{ total: number }>>,
  ): Promise<number | null> {
    try {
      return (await query())[0]?.total ?? 0;
    } catch (error) {
      this.logger.warn(
        `监控统计工作负载失败：${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private readProcessInfo(): SystemMonitorOverview['process'] {
    const now = process.hrtime.bigint();
    const currentUsage = process.cpuUsage();
    const elapsedMicros = Number(now - this.previousCpu.at) / 1_000;
    const userMicros = currentUsage.user - this.previousCpu.usage.user;
    const systemMicros = currentUsage.system - this.previousCpu.usage.system;
    const cpuCount = Math.max(os.cpus().length, 1);
    const cpuUsagePercent =
      elapsedMicros <= 0
        ? 0
        : roundPercent(
            ((userMicros + systemMicros) / elapsedMicros / cpuCount) * 100,
          );

    this.previousCpu = { usage: currentUsage, at: now };
    const memory = process.memoryUsage();

    return {
      pid: process.pid,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      rssBytes: memory.rss,
      heapTotalBytes: memory.heapTotal,
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external,
      cpuUsagePercent,
    };
  }
}

function elapsedMilliseconds(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function roundPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}
