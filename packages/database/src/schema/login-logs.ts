import { LOGIN_STATUS, type LoginStatus } from '@nest-admin/shared';
import {
  index,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

import { foreignId, primaryId } from './columns';

export { LOGIN_STATUS, type LoginStatus };

/** 登录审计日志。成功与失败都记录，历史数据按保留期物理清理。 */
export const loginLogs = mysqlTable(
  'sys_login_log',
  {
    id: primaryId(),
    /** 登录失败时可能无法确定用户，因此允许为空且不建外键。 */
    userId: foreignId('user_id'),
    username: varchar('username', { length: 32 }).notNull(),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
    status: mysqlEnum('status', LOGIN_STATUS).notNull(),
    failureReason: varchar('failure_reason', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_sys_login_log_user_id').on(table.userId),
    index('idx_sys_login_log_username').on(table.username),
    index('idx_sys_login_log_status').on(table.status),
    index('idx_sys_login_log_created_at').on(table.createdAt),
  ],
);

export type LoginLogRow = typeof loginLogs.$inferSelect;
export type NewLoginLogRow = typeof loginLogs.$inferInsert;
