import {
  loginLogs,
  operationLogs,
  refreshTokens,
  type LoginLogRow,
  type OperationLogRow,
} from '@nest-admin/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import type { Env } from '../../config/env.validation';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import { RedisLockService } from '../../redis/redis-lock.service';
import {
  LOG_ARCHIVE_STORAGE,
  type FileStorage,
} from '../file/file-storage.interface';

/** 单批删除行数。太小则往返次数多，太大则单条语句持锁时间长 */
const BATCH_SIZE = 1000;

/** 单次任务最多删多少批，防止一次跑太久占着连接 */
const MAX_BATCHES = 100;

const LOCK_KEY = 'cleanup:logs';
const LOCK_TTL_MS = 10 * 60 * 1000;
const gzipAsync = promisify(gzip);

type LogArchiveRow = LoginLogRow | OperationLogRow;

export interface CleanupResult {
  loginLogs: number;
  operationLogs: number;
  refreshTokens: number;
}

@Injectable()
export class LogCleanupService {
  private readonly logger = new Logger(LogCleanupService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService<Env, true>,
    private readonly lock: RedisLockService,
    @Inject(LOG_ARCHIVE_STORAGE) private readonly storage: FileStorage,
  ) {}

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
      loginLogs: await this.archiveLoginLogs(cutoff),
      operationLogs: await this.archiveOperationLogs(cutoff),
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

  private archiveLoginLogs(cutoff: Date): Promise<number> {
    return this.archiveInBatches(
      '登录日志',
      'login-logs',
      cutoff,
      () =>
        this.db
          .select()
          .from(loginLogs)
          .where(lt(loginLogs.createdAt, cutoff))
          .orderBy(asc(loginLogs.createdAt), asc(loginLogs.id))
          .limit(BATCH_SIZE),
      (rows) =>
        this.db.delete(loginLogs).where(
          and(
            inArray(
              loginLogs.id,
              rows.map((row) => row.id),
            ),
            lt(loginLogs.createdAt, cutoff),
          ),
        ),
    );
  }

  private archiveOperationLogs(cutoff: Date): Promise<number> {
    return this.archiveInBatches(
      '操作日志',
      'operation-logs',
      cutoff,
      () =>
        this.db
          .select()
          .from(operationLogs)
          .where(lt(operationLogs.createdAt, cutoff))
          .orderBy(asc(operationLogs.createdAt), asc(operationLogs.id))
          .limit(BATCH_SIZE),
      (rows) =>
        this.db.delete(operationLogs).where(
          and(
            inArray(
              operationLogs.id,
              rows.map((row) => row.id),
            ),
            lt(operationLogs.createdAt, cutoff),
          ),
        ),
    );
  }

  /**
   * 分批归档并删除。一条大范围 DELETE 会长时间持锁并撑爆 undo/binlog，
   * 所以每批先生成幂等归档对象，再只删除已归档的行。
   */
  private async archiveInBatches(
    label: string,
    archiveTable: string,
    cutoff: Date,
    selectBatch: () => Promise<LogArchiveRow[]>,
    deleteBatch: (rows: LogArchiveRow[]) => Promise<unknown>,
  ): Promise<number> {
    let total = 0;

    for (let i = 0; i < MAX_BATCHES; i++) {
      const rows = await selectBatch();
      if (rows.length === 0) return total;

      await this.archiveBatch(label, archiveTable, cutoff, rows);

      const result = (await deleteBatch(rows)) as [{ affectedRows: number }];
      const affected = result[0]?.affectedRows ?? 0;

      total += affected;

      if (rows.length < BATCH_SIZE) {
        return total;
      }
    }

    this.logger.warn(
      `${label}达到单次上限（${MAX_BATCHES * BATCH_SIZE} 行），剩余部分留到下一轮`,
    );

    return total;
  }

  private async deleteInBatches(
    label: string,
    deleteBatch: () => Promise<unknown>,
  ): Promise<number> {
    let total = 0;

    for (let batchIndex = 0; batchIndex < MAX_BATCHES; batchIndex++) {
      const result = (await deleteBatch()) as [{ affectedRows: number }];
      const affected = result[0]?.affectedRows ?? 0;

      total += affected;

      if (affected < BATCH_SIZE) return total;
    }

    this.logger.warn(
      `${label}达到单次上限（${MAX_BATCHES * BATCH_SIZE} 行），剩余部分留到下一轮`,
    );

    return total;
  }

  private async archiveBatch(
    label: string,
    archiveTable: string,
    cutoff: Date,
    rows: LogArchiveRow[],
  ): Promise<void> {
    const first = rows[0];
    const last = rows[rows.length - 1];
    const key = buildArchiveKey(
      this.config.get('LOG_ARCHIVE_PREFIX', { infer: true }),
      archiveTable,
      first,
      last,
    );
    const payload = {
      schemaVersion: 1,
      source: 'nest-admin',
      table: archiveTable,
      archivedAt: new Date().toISOString(),
      cutoffAt: cutoff.toISOString(),
      firstId: first.id,
      lastId: last.id,
      rowCount: rows.length,
      rows,
    };

    try {
      await this.storage.upload({
        key,
        buffer: await gzipAsync(Buffer.from(JSON.stringify(payload), 'utf8')),
        contentType: 'application/gzip',
        overwrite: true,
      });
    } catch (error) {
      this.logger.error(
        `${label}归档失败，已保留原始日志对象 ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error(`${label}归档失败，原始日志已保留`);
    }
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

function buildArchiveKey(
  prefix: string,
  table: string,
  first: LogArchiveRow,
  last: LogArchiveRow,
): string {
  const date = first.createdAt;
  const datePath = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('/');
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '') || 'archives/logs';

  return `${normalizedPrefix}/${table}/${datePath}/${first.id}-${last.id}.json.gz`;
}
