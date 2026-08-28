import { STATUS } from '@nest-admin/shared';
import {
  index,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, primaryId } from './columns';

export const users = mysqlTable(
  'sys_user',
  {
    id: primaryId(),
    username: varchar('username', { length: 32 }).notNull(),
    /** bcrypt 哈希，任何对外返回都必须剔除该字段 */
    password: varchar('password', { length: 100 }).notNull(),
    nickname: varchar('nickname', { length: 32 }),
    email: varchar('email', { length: 128 }),
    phone: varchar('phone', { length: 20 }),
    avatar: varchar('avatar', { length: 255 }),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    lastLoginAt: timestamp('last_login_at'),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_user_username').on(table.username),
    index('idx_sys_user_status').on(table.status),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
/**
 * 对外可见的用户字段：去掉密码，也去掉 deletedAt——
 * 对外查询永远只返回未删除的行，这个字段对调用方没有信息量。
 */
export type SafeUser = Omit<UserRow, 'password' | 'deletedAt'>;
