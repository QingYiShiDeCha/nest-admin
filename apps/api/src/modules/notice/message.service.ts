import { noticeRecipients, notices } from '@nest-admin/database';
import type {
  NoticeMessage,
  NoticeRealtimeEvent,
  PaginatedResult,
} from '@nest-admin/shared';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  private readonly logger = new Logger(MessageService.name);

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

  /**
   * 查询用户在断线期间错过的消息事件，用于 SSE 重连时的历史事件重放。
   *
   * @param userId 用户 ID
   * @param lastEventId 用户最后接收的事件 ID（来自 SSE 的 Last-Event-ID 请求头）
   * @returns 断线期间产生的历史事件列表（按时间升序，先推送旧事件）
   */
  async findMissedEvents(
    userId: number,
    lastEventId: string,
  ): Promise<NoticeRealtimeEvent[]> {
    try {
      // 解析 lastEventId 的时间戳部分（格式: uuid@timestamp）
      const lastTimestamp = this.parseEventTimestamp(lastEventId);
      if (!lastTimestamp) {
        this.logger.debug(
          `无法解析事件 ID ${lastEventId}，跳过历史事件重放`,
        );
        return [];
      }

      // 查询断线后新增的消息（通过 createdAt 判断）
      const missedMessages = await this.db
        .select({
          id: noticeRecipients.id,
          noticeId: notices.id,
          createdAt: noticeRecipients.createdAt,
          readAt: noticeRecipients.readAt,
        })
        .from(noticeRecipients)
        .innerJoin(notices, eq(notices.id, noticeRecipients.noticeId))
        .where(
          and(
            eq(noticeRecipients.userId, userId),
            eq(notices.status, 'published'),
            isNull(notices.deletedAt),
            gt(noticeRecipients.createdAt, lastTimestamp),
          ),
        )
        .orderBy(noticeRecipients.createdAt)
        .limit(50); // 限制最多重放 50 条，避免一次推送过多

      // 将消息记录转换为实时事件
      const events: NoticeRealtimeEvent[] = missedMessages.map((msg) => ({
        id: this.generateEventId(msg.createdAt),
        type: 'message.created' as const,
        occurredAt: msg.createdAt.toISOString(),
        messageId: msg.id,
        noticeId: msg.noticeId,
      }));

      if (events.length > 0) {
        this.logger.log(
          `用户 ${userId} 重连，推送 ${events.length} 条历史消息事件`,
        );
      }

      return events;
    } catch (error) {
      this.logger.error(
        `查询用户 ${userId} 的历史事件失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * 从事件 ID 中解析时间戳。
   * 事件 ID 格式: {uuid}@{timestamp} 或纯 uuid（旧格式）
   */
  private parseEventTimestamp(eventId: string): Date | null {
    const parts = eventId.split('@');
    if (parts.length === 2) {
      const timestamp = parseInt(parts[1], 10);
      if (!isNaN(timestamp) && timestamp > 0) {
        return new Date(timestamp);
      }
    }

    // 旧格式或无法解析，返回较早的时间（5分钟前）作为降级
    return new Date(Date.now() - 5 * 60 * 1000);
  }

  /**
   * 生成带时间戳的事件 ID，用于历史事件重放。
   * 格式: {uuid}@{timestamp}
   */
  private generateEventId(timestamp: Date): string {
    const uuid = crypto.randomUUID();
    return `${uuid}@${timestamp.getTime()}`;
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
