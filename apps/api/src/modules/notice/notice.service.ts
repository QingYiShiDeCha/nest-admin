import {
  departments,
  noticeRecipients,
  noticeTargets,
  notices,
  roles,
  userRoles,
  users,
  type NoticeRow,
} from '@nest-admin/database';
import type {
  NoticeTargetOption,
  NoticeTargetType,
  PaginatedResult,
} from '@nest-admin/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { RequestContext } from '../../common/context/request-context.service';
import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { CreateNoticeDto } from './dto/create-notice.dto';
import type { QueryNoticeDto } from './dto/query-notice.dto';
import type { QueryNoticeTargetDto } from './dto/query-notice-target.dto';
import type { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeEventService } from './notice-event.service';

export interface NoticeListRecord extends NoticeRow {
  targetCount: number;
  recipientCount: number;
  readCount: number;
}

export interface NoticeDetailRecord extends NoticeListRecord {
  targets: NoticeTargetOption[];
}

function aliveNotice(...conditions: (SQL | undefined)[]): SQL {
  return and(isNull(notices.deletedAt), ...conditions)!;
}

@Injectable()
export class NoticeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ctx: RequestContext,
    private readonly events: NoticeEventService,
  ) {}

  async findPage(
    query: QueryNoticeDto,
  ): Promise<PaginatedResult<NoticeListRecord>> {
    const where = aliveNotice(
      query.keyword ? like(notices.title, `%${query.keyword}%`) : undefined,
      query.status ? eq(notices.status, query.status) : undefined,
      query.type ? eq(notices.type, query.type) : undefined,
      query.priority ? eq(notices.priority, query.priority) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(notices)
        .where(where)
        .orderBy(desc(notices.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db.select({ total: count() }).from(notices).where(where),
    ]);

    return {
      list: await this.withMetrics(rows),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findDetail(id: number): Promise<NoticeDetailRecord> {
    const notice = await this.findNoticeOrFail(id);
    const [record] = await this.withMetrics([notice]);

    return {
      ...record,
      targets: await this.findTargetLabels(id, notice.targetType),
    };
  }

  async findTargetOptions(
    query: QueryNoticeTargetDto,
  ): Promise<NoticeTargetOption[]> {
    const keyword = query.keyword ? `%${query.keyword}%` : undefined;

    if (query.targetType === 'department') {
      return this.db
        .select({
          id: departments.id,
          label: departments.name,
          description: departments.code,
        })
        .from(departments)
        .where(
          and(
            eq(departments.status, 'active'),
            isNull(departments.deletedAt),
            keyword
              ? or(
                  like(departments.name, keyword),
                  like(departments.code, keyword),
                )
              : undefined,
          ),
        )
        .orderBy(asc(departments.sort), asc(departments.id))
        .limit(100);
    }

    if (query.targetType === 'role') {
      return this.db
        .select({ id: roles.id, label: roles.name, description: roles.code })
        .from(roles)
        .where(
          and(
            eq(roles.status, 'active'),
            isNull(roles.deletedAt),
            keyword
              ? or(like(roles.name, keyword), like(roles.code, keyword))
              : undefined,
          ),
        )
        .orderBy(asc(roles.sort), asc(roles.id))
        .limit(100);
    }

    return this.db
      .select({
        id: users.id,
        label: sql<string>`COALESCE(${users.nickname}, ${users.username})`,
        description: users.username,
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          isNull(users.deletedAt),
          keyword
            ? or(like(users.nickname, keyword), like(users.username, keyword))
            : undefined,
        ),
      )
      .orderBy(asc(users.id))
      .limit(50);
  }

  async create(dto: CreateNoticeDto): Promise<NoticeDetailRecord> {
    const targetIds = normalizeIds(dto.targetIds);
    validateTargetSelection(dto.targetType, targetIds);
    await this.assertTargetsUsable(dto.targetType, targetIds);
    const expiresAt = parseExpiry(dto.expiresAt);

    const noticeId = await this.db.transaction(async (tx) => {
      const [result] = await tx.insert(notices).values({
        title: dto.title,
        content: dto.content,
        type: dto.type,
        priority: dto.priority,
        targetType: dto.targetType,
        expiresAt,
        ...this.ctx.auditOnCreate(),
      });

      if (targetIds.length > 0) {
        await tx.insert(noticeTargets).values(
          targetIds.map((targetId) => ({
            noticeId: result.insertId,
            targetType: dto.targetType,
            targetId,
            createdBy: this.ctx.userId,
          })),
        );
      }

      return result.insertId;
    });

    return this.findDetail(noticeId);
  }

  async update(id: number, dto: UpdateNoticeDto): Promise<NoticeDetailRecord> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const current = await this.findNoticeOrFail(id);
    if (current.status === 'published') {
      throw new ConflictException('已发布公告不能编辑，请先撤回');
    }

    const targetChanged =
      dto.targetType !== undefined || dto.targetIds !== undefined;
    const nextTargetType = dto.targetType ?? current.targetType;
    const nextTargetIds = targetChanged
      ? dto.targetIds !== undefined
        ? normalizeIds(dto.targetIds)
        : nextTargetType === current.targetType
          ? await this.findTargetIds(id)
          : []
      : [];

    if (targetChanged) {
      validateTargetSelection(nextTargetType, nextTargetIds);
      await this.assertTargetsUsable(nextTargetType, nextTargetIds);
    }

    const expiresAt =
      dto.expiresAt === undefined ? undefined : parseExpiry(dto.expiresAt);

    await this.db.transaction(async (tx) => {
      await tx
        .update(notices)
        .set({
          title: dto.title,
          content: dto.content,
          type: dto.type,
          priority: dto.priority,
          targetType: dto.targetType,
          expiresAt,
          ...this.ctx.auditOnUpdate(),
        })
        .where(aliveNotice(eq(notices.id, id)));

      if (targetChanged) {
        await tx.delete(noticeTargets).where(eq(noticeTargets.noticeId, id));
        if (nextTargetIds.length > 0) {
          await tx.insert(noticeTargets).values(
            nextTargetIds.map((targetId) => ({
              noticeId: id,
              targetType: nextTargetType,
              targetId,
              createdBy: this.ctx.userId,
            })),
          );
        }
      }
    });

    return this.findDetail(id);
  }

  async publish(id: number): Promise<NoticeDetailRecord> {
    const notice = await this.findNoticeOrFail(id);
    if (notice.status === 'published') {
      throw new ConflictException('公告已经发布');
    }
    if (notice.expiresAt && notice.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('公告过期时间必须晚于当前时间');
    }

    const targetIds = await this.findTargetIds(id);
    validateTargetSelection(notice.targetType, targetIds);
    await this.assertTargetsUsable(notice.targetType, targetIds);
    const recipientIds = await this.resolveRecipientIds(
      notice.targetType,
      targetIds,
    );

    if (recipientIds.length === 0) {
      throw new BadRequestException('当前接收范围内没有可接收公告的启用用户');
    }

    await this.db.transaction(async (tx) => {
      const [result] = await tx
        .update(notices)
        .set({
          status: 'published',
          publisherName: this.ctx.username,
          publishedAt: sql`CURRENT_TIMESTAMP`,
          withdrawnAt: null,
          ...this.ctx.auditOnUpdate(),
        })
        .where(
          aliveNotice(eq(notices.id, id), eq(notices.status, notice.status)),
        );

      if (result.affectedRows !== 1) {
        throw new ConflictException('公告状态已变化，请刷新后重试');
      }

      await tx
        .delete(noticeRecipients)
        .where(eq(noticeRecipients.noticeId, id));

      for (let offset = 0; offset < recipientIds.length; offset += 500) {
        await tx.insert(noticeRecipients).values(
          recipientIds.slice(offset, offset + 500).map((userId) => ({
            noticeId: id,
            userId,
          })),
        );
      }
    });

    await this.events.publishToUsers(recipientIds, 'message.created', {
      noticeId: id,
    });

    return this.findDetail(id);
  }

  async withdraw(id: number): Promise<NoticeDetailRecord> {
    await this.findNoticeOrFail(id);
    const recipientIds = await this.findRecipientIds(id);
    const [result] = await this.db
      .update(notices)
      .set({
        status: 'withdrawn',
        withdrawnAt: sql`CURRENT_TIMESTAMP`,
        ...this.ctx.auditOnUpdate(),
      })
      .where(aliveNotice(eq(notices.id, id), eq(notices.status, 'published')));

    if (result.affectedRows !== 1) {
      throw new ConflictException('只有已发布公告可以撤回');
    }

    await this.events.publishToUsers(recipientIds, 'message.withdrawn', {
      noticeId: id,
    });

    return this.findDetail(id);
  }

  async remove(id: number): Promise<void> {
    const notice = await this.findNoticeOrFail(id);
    if (notice.status === 'published') {
      throw new ConflictException('已发布公告不能删除，请先撤回');
    }

    await this.db
      .update(notices)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, ...this.ctx.auditOnUpdate() })
      .where(aliveNotice(eq(notices.id, id)));
  }

  private async findNoticeOrFail(id: number): Promise<NoticeRow> {
    const [notice] = await this.db
      .select()
      .from(notices)
      .where(aliveNotice(eq(notices.id, id)))
      .limit(1);

    if (!notice) throw new NotFoundException(`公告 ${id} 不存在`);
    return notice;
  }

  private async findTargetIds(noticeId: number): Promise<number[]> {
    const rows = await this.db
      .select({ id: noticeTargets.targetId })
      .from(noticeTargets)
      .where(eq(noticeTargets.noticeId, noticeId));
    return rows.map((row) => row.id);
  }

  private async findRecipientIds(noticeId: number): Promise<number[]> {
    const rows = await this.db
      .select({ id: noticeRecipients.userId })
      .from(noticeRecipients)
      .where(eq(noticeRecipients.noticeId, noticeId));
    return rows.map((row) => row.id);
  }

  private async findTargetLabels(
    noticeId: number,
    targetType: NoticeTargetType,
  ): Promise<NoticeTargetOption[]> {
    if (targetType === 'all') return [];
    const ids = await this.findTargetIds(noticeId);
    if (ids.length === 0) return [];

    if (targetType === 'department') {
      return this.db
        .select({
          id: departments.id,
          label: departments.name,
          description: departments.code,
        })
        .from(departments)
        .where(inArray(departments.id, ids));
    }

    if (targetType === 'role') {
      return this.db
        .select({ id: roles.id, label: roles.name, description: roles.code })
        .from(roles)
        .where(inArray(roles.id, ids));
    }

    return this.db
      .select({
        id: users.id,
        label: sql<string>`COALESCE(${users.nickname}, ${users.username})`,
        description: users.username,
      })
      .from(users)
      .where(inArray(users.id, ids));
  }

  private async assertTargetsUsable(
    targetType: NoticeTargetType,
    ids: number[],
  ): Promise<void> {
    if (targetType === 'all') return;

    let found: { id: number }[];
    if (targetType === 'department') {
      found = await this.db
        .select({ id: departments.id })
        .from(departments)
        .where(
          and(
            inArray(departments.id, ids),
            eq(departments.status, 'active'),
            isNull(departments.deletedAt),
          ),
        );
    } else if (targetType === 'role') {
      found = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            inArray(roles.id, ids),
            eq(roles.status, 'active'),
            isNull(roles.deletedAt),
          ),
        );
    } else {
      found = await this.db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            inArray(users.id, ids),
            eq(users.status, 'active'),
            isNull(users.deletedAt),
          ),
        );
    }

    if (found.length !== ids.length) {
      const foundIds = new Set(found.map((row) => row.id));
      const invalidIds = ids.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `以下接收对象不存在、已停用或已删除：${invalidIds.join(', ')}`,
      );
    }
  }

  private async resolveRecipientIds(
    targetType: NoticeTargetType,
    targetIds: number[],
  ): Promise<number[]> {
    if (targetType === 'role') {
      const rows = await this.db
        .selectDistinct({ id: users.id })
        .from(userRoles)
        .innerJoin(
          users,
          and(
            eq(users.id, userRoles.userId),
            eq(users.status, 'active'),
            isNull(users.deletedAt),
          ),
        )
        .where(inArray(userRoles.roleId, targetIds));
      return rows.map((row) => row.id);
    }

    const conditions: SQL[] = [
      eq(users.status, 'active'),
      isNull(users.deletedAt),
    ];
    if (targetType === 'department') {
      conditions.push(inArray(users.deptId, targetIds));
    } else if (targetType === 'user') {
      conditions.push(inArray(users.id, targetIds));
    }

    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions));
    return rows.map((row) => row.id);
  }

  private async withMetrics(rows: NoticeRow[]): Promise<NoticeListRecord[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);

    const [targetRows, recipientRows] = await Promise.all([
      this.db
        .select({ noticeId: noticeTargets.noticeId, total: count() })
        .from(noticeTargets)
        .where(inArray(noticeTargets.noticeId, ids))
        .groupBy(noticeTargets.noticeId),
      this.db
        .select({
          noticeId: noticeRecipients.noticeId,
          total: count(),
          read: sql<number>`SUM(CASE WHEN ${isNotNull(noticeRecipients.readAt)} THEN 1 ELSE 0 END)`.mapWith(
            Number,
          ),
        })
        .from(noticeRecipients)
        .where(inArray(noticeRecipients.noticeId, ids))
        .groupBy(noticeRecipients.noticeId),
    ]);

    const targetCounts = new Map(
      targetRows.map((row) => [row.noticeId, row.total]),
    );
    const recipientMetrics = new Map(
      recipientRows.map((row) => [
        row.noticeId,
        { total: row.total, read: row.read },
      ]),
    );

    return rows.map((row) => {
      const metrics = recipientMetrics.get(row.id);
      return {
        ...row,
        targetCount:
          row.targetType === 'all' ? 0 : (targetCounts.get(row.id) ?? 0),
        recipientCount: metrics?.total ?? 0,
        readCount: metrics?.read ?? 0,
      };
    });
  }
}

function normalizeIds(ids?: number[]): number[] {
  return [...new Set(ids ?? [])];
}

export function validateTargetSelection(
  targetType: NoticeTargetType,
  ids: number[],
): void {
  if (targetType === 'all' && ids.length > 0) {
    throw new BadRequestException('全员公告不能指定接收对象');
  }
  if (targetType !== 'all' && ids.length === 0) {
    throw new BadRequestException('定向公告至少选择一个接收对象');
  }
}

function parseExpiry(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(value);
  if (date.getTime() <= Date.now()) {
    throw new BadRequestException('公告过期时间必须晚于当前时间');
  }
  return date;
}
