import {
  loginLogs,
  type LoginLogRow,
  type NewLoginLogRow,
} from '@nest-admin/database';
import type { PaginatedResult } from '@nest-admin/shared';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gte, like, lte, type SQL } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import {
  DataScopeService,
  type DataScopeSubject,
} from '../rbac/data-scope.service';
import type { QueryLoginLogDto } from './dto/query-login-log.dto';

@Injectable()
export class LoginLogService {
  private readonly logger = new Logger(LoginLogService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly dataScopes: DataScopeService,
  ) {}

  async record(entry: NewLoginLogRow): Promise<void> {
    try {
      await this.db.insert(loginLogs).values(entry);
    } catch (error) {
      this.logger.error(
        `登录日志写入失败：${entry.username}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async findPage(
    query: QueryLoginLogDto,
    subject: DataScopeSubject,
  ): Promise<PaginatedResult<LoginLogRow>> {
    const scopeCondition = await this.dataScopes.buildUserIdCondition(
      subject,
      loginLogs.userId,
    );
    const conditions: (SQL | undefined)[] = [
      scopeCondition,
      query.username
        ? like(loginLogs.username, `%${query.username}%`)
        : undefined,
      query.status ? eq(loginLogs.status, query.status) : undefined,
      query.startAt ? gte(loginLogs.createdAt, query.startAt) : undefined,
      query.endAt ? lte(loginLogs.createdAt, query.endAt) : undefined,
    ];
    const filtered = conditions.filter((condition) => condition !== undefined);
    const where = filtered.length > 0 ? and(...filtered) : undefined;

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(loginLogs)
        .where(where)
        .orderBy(desc(loginLogs.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(loginLogs).where(where),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: number, subject: DataScopeSubject): Promise<LoginLogRow> {
    const scopeCondition = await this.dataScopes.buildUserIdCondition(
      subject,
      loginLogs.userId,
    );
    const [log] = await this.db
      .select()
      .from(loginLogs)
      .where(and(eq(loginLogs.id, id), scopeCondition))
      .limit(1);

    if (!log) {
      throw new NotFoundException(`登录日志 ${id} 不存在`);
    }

    return log;
  }
}
