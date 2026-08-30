import {
  NOTICE_PRIORITY,
  NOTICE_STATUS,
  NOTICE_TARGET_TYPE,
  NOTICE_TYPE,
} from '@nest-admin/shared';
import {
  index,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, primaryId } from './columns';

export const notices = mysqlTable(
  'sys_notice',
  {
    id: primaryId(),
    title: varchar('title', { length: 128 }).notNull(),
    content: text('content').notNull(),
    type: mysqlEnum('type', NOTICE_TYPE).notNull().default('notice'),
    priority: mysqlEnum('priority', NOTICE_PRIORITY)
      .notNull()
      .default('normal'),
    targetType: mysqlEnum('target_type', NOTICE_TARGET_TYPE).notNull(),
    status: mysqlEnum('status', NOTICE_STATUS).notNull().default('draft'),
    /** 发布人名称快照，账号后续改名或删除不影响历史。 */
    publisherName: varchar('publisher_name', { length: 64 }),
    publishedAt: timestamp('published_at'),
    withdrawnAt: timestamp('withdrawn_at'),
    expiresAt: timestamp('expires_at'),
    ...auditColumns(),
  },
  (table) => [
    index('idx_sys_notice_status_published').on(
      table.status,
      table.publishedAt,
    ),
    index('idx_sys_notice_created_by').on(table.createdBy),
  ],
);

export type NoticeRow = typeof notices.$inferSelect;
export type NewNoticeRow = typeof notices.$inferInsert;
