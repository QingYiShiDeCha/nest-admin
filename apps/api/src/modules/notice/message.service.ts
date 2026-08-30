import { noticeRecipients, notices } from '@nest-admin/database';
import type { NoticeMessage, PaginatedResult } from '@nest-admin/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gt,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import type { QueryMessageDto } from './dto/query-message.dto';
import { NoticeEventService } from './notice-event.service';

export function availableMessage(userId: number, ...conditions: SQL[]): SQL {
  return and(
    eq(noticeRecipients.userId, userId),
    eq(notices.status, 'published'),
    isNull(notices.deletedAt),
    or(isNull(notices.expiresAt), gt(notices.expiresAt, new Date())),
    ...conditions,
  )!;
}

const messageColumns = {
  id: noticeRecipients.id,
  noticeId: notices.id,
  title: notices.title,
  content: notices.content,
  type: notices.type,
  priority: notices.priority,
  publisherName: notices.publisherName,
  publishedAt: notices.publishedAt,
  expiresAt: notices.expiresAt,
  readAt: noticeRecipients.readAt,
  createdAt: noticeRecipients.createdAt,
} as const;

@Injectable()
export class MessageService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly events: NoticeEventService,
  ) {}

  async findPage(
    userId: number,
    query: QueryMessageDto,
  ): Promise<PaginatedResult<NoticeMessageRecord>> {
    const readCondition =
      query.readStatus === 'read'
        ? sql`${noticeRecipients.readAt} IS NOT NULL`
        : query.readStatus === 'unread'
          ? isNull(noticeRecipients.readAt)
          : undefined;
    const where = availableMessage(
      userId,
      ...(readCondition ? [readCondition] : []),
    );

    const [list, [{ total }]] = await Promise.all([
      this.db
        .select(messageColumns)
        .from(noticeRecipients)
        .innerJoin(notices, eq(notices.id, noticeRecipients.noticeId))
        .where(where)
        .orderBy(desc(notices.publishedAt), desc(noticeRecipients.id))
        .limit(query.pageSize)
        .offset(query.offset),
      this.db
        .select({ total: count() })
        .from(noticeRecipients)
        .innerJoin(notices, eq(notices.id, noticeRecipients.noticeId))
        .where(where),
    ]);

    return { list, total, page: query.page, pageSize: query.pageSize };
  }

  async findRecent(userId: number): Promise<NoticeMessageRecord[]> {
    return this.db
      .select(messageColumns)
      .from(noticeRecipients)
      .innerJoin(notices, eq(notices.id, noticeRecipients.noticeId))
      .where(availableMessage(userId))
      .orderBy(desc(notices.publishedAt), desc(noticeRecipients.id))
      .limit(5);
  }

  async findDetail(id: number, userId: number): Promise<NoticeMessageRecord> {
    const [message] = await this.db
      .select(messageColumns)
      .from(noticeRecipients)
      .innerJoin(notices, eq(notices.id, noticeRecipients.noticeId))
      .where(availableMessage(userId, eq(noticeRecipients.id, id)))
      .limit(1);

    if (!message) throw new NotFoundException(`消息 ${id} 不存在`);
    return message;
  }

  async unreadCount(userId: number): Promise<{ count: number }> {
    const [result] = await this.db
      .select({ count: count() })
      .from(noticeRecipients)
      .innerJoin(notices, eq(notices.id, noticeRecipients.noticeId))
      .where(availableMessage(userId, isNull(noticeRecipients.readAt)));
    return result;
  }

  async markRead(id: number, userId: number): Promise<void> {
    const message = await this.findDetail(id, userId);
    const [result] = await this.db
      .update(noticeRecipients)
      .set({ readAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(noticeRecipients.id, id),
          eq(noticeRecipients.userId, userId),
          isNull(noticeRecipients.readAt),
        ),
      );

    if (result.affectedRows === 1) {
      await this.events.publishToUsers([userId], 'message.read', {
        messageId: id,
        noticeId: message.noticeId,
      });
    }
  }

  async markAllRead(userId: number): Promise<void> {
    const [result] = await this.db
      .update(noticeRecipients)
      .set({ readAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(noticeRecipients.userId, userId),
          isNull(noticeRecipients.readAt),
        ),
      );

    if (result.affectedRows > 0) {
      await this.events.publishToUsers([userId], 'message.read-all');
    }
  }
}

export interface NoticeMessageRecord extends Omit<
  NoticeMessage,
  'createdAt' | 'expiresAt' | 'publishedAt' | 'readAt'
> {
  createdAt: Date;
  expiresAt: Date | null;
  publishedAt: Date | null;
  readAt: Date | null;
}
