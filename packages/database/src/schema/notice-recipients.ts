import {
  index,
  mysqlTable,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';

import { foreignId, primaryId } from './columns';
import { notices } from './notices';
import { users } from './users';

/** 发布时展开出的收件人快照，用户之后换部门或角色不会改变既有接收历史。 */
export const noticeRecipients = mysqlTable(
  'sys_notice_recipient',
  {
    id: primaryId(),
    noticeId: foreignId('notice_id')
      .notNull()
      .references(() => notices.id, { onDelete: 'cascade' }),
    userId: foreignId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uk_sys_notice_recipient_notice_user').on(
      table.noticeId,
      table.userId,
    ),
    index('idx_sys_notice_recipient_user_read').on(table.userId, table.readAt),
    index('idx_sys_notice_recipient_notice').on(table.noticeId),
  ],
);

export type NoticeRecipientRow = typeof noticeRecipients.$inferSelect;
