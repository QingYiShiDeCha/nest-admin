import {
  operationLogs,
  type NewOperationLogRow,
  type OperationLogRow,
} from '@nest-admin/database';
import type { PaginatedResult } from '@nest-admin/shared';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gte, like, lte, type SQL } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { QueryOperationLogDto } from './dto/query-operation-log.dto';

@Injectable()
export class OperationLogService {
  private readonly logger = new Logger(OperationLogService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * 写入一条日志。刻意不抛错也不 await 调用方——
   * 日志是旁路，落库失败只该留下一行告警，不能让业务请求跟着失败。
   */
  async record(entry: NewOperationLogRow): Promise<void> {
    try {
      await this.db.insert(operationLogs).values(entry);
    } catch (error) {
      this.logger.error(
        `操作日志写入失败：${entry.method} ${entry.path}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async findPage(
    query: QueryOperationLogDto,
  ): Promise<PaginatedResult<OperationLogRow>> {
    const conditions: (SQL | undefined)[] = [
      query.username
        ? like(operationLogs.username, `%${query.username}%`)
        : undefined,
      query.module ? eq(operationLogs.module, query.module) : undefined,
      query.status ? eq(operationLogs.status, query.status) : undefined,
      query.startAt ? gte(operationLogs.createdAt, query.startAt) : undefined,
      query.endAt ? lte(operationLogs.createdAt, query.endAt) : undefined,
    ];

    const filtered = conditions.filter((item) => item !== undefined);
    const where = filtered.length > 0 ? and(...filtered) : undefined;

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(operationLogs)
        .where(where)
        .orderBy(desc(operationLogs.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(operationLogs).where(where),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: number): Promise<OperationLogRow> {
    const [log] = await this.db
      .select()
      .from(operationLogs)
      .where(eq(operationLogs.id, id))
      .limit(1);

    if (!log) {
      throw new NotFoundException(`日志 ${id} 不存在`);
    }

    return log;
  }
}
