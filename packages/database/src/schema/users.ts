import { STATUS } from '@nest-admin/shared';
import {
  type AnyMySqlColumn,
  index,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, primaryId } from './columns';
import { departments } from './departments';
import { foreignId } from './columns';

export const users = mysqlTable(
  'sys_user',
  {
    id: primaryId(),
    deptId: foreignId('dept_id').references(
      (): AnyMySqlColumn => departments.id,
      { onDelete: 'restrict' },
    ),
    username: varchar('username', { length: 32 }).notNull(),
    /** bcrypt 哈希，任何对外返回都必须剔除该字段 */
    password: varchar('password', { length: 100 }).notNull(),
    nickname: varchar('nickname', { length: 32 }),
    email: varchar('email', { length: 128 }),
    phone: varchar('phone', { length: 20 }),
    avatar: varchar('avatar', { length: 255 }),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    /**
     * 登录失败累计达到阈值后的锁定截止时间。
     * null 或早于当前时间即未锁定；计数本身走 Redis，这里只保存
     * 「权威锁定态」用于跨实例一致性与管理员可见。
     */
    lockedUntil: timestamp('locked_until'),
    lastLoginAt: timestamp('last_login_at'),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_user_username').on(table.username),
    index('idx_sys_user_status').on(table.status),
    index('idx_sys_user_dept_id').on(table.deptId),
    index('idx_sys_user_locked_until').on(table.lockedUntil),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
/**
 * 对外可见的用户字段：去掉密码，也去掉 deletedAt——
 * 对外查询永远只返回未删除的行，这个字段对调用方没有信息量。
 */
export type SafeUser = Omit<UserRow, 'password' | 'deletedAt'>;
