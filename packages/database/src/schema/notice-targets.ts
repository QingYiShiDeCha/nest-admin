import { NOTICE_TARGET_TYPE } from '@nest-admin/shared';
import {
  index,
  mysqlEnum,
  mysqlTable,
  primaryKey,
} from 'drizzle-orm/mysql-core';

import { foreignId, grantColumns } from './columns';
import { notices } from './notices';

/**
 * 公告的定向范围。target_id 是多态引用，由 service 按 target_type 校验：
 * department -> sys_dept，role -> sys_role，user -> sys_user。
 */
export const noticeTargets = mysqlTable(
  'sys_notice_target',
  {
    noticeId: foreignId('notice_id')
      .notNull()
      .references(() => notices.id, { onDelete: 'cascade' }),
    targetType: mysqlEnum('target_type', NOTICE_TARGET_TYPE).notNull(),
    targetId: foreignId('target_id').notNull(),
    ...grantColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.noticeId, table.targetType, table.targetId] }),
    index('idx_sys_notice_target_lookup').on(table.targetType, table.targetId),
  ],
);

export type NoticeTargetRow = typeof noticeTargets.$inferSelect;
