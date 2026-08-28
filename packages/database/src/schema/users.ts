import { USER_STATUS } from '@nest-admin/shared';
import {
  bigint,
  index,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable(
  'sys_user',
  {
    id: bigint('id', { mode: 'number', unsigned: true })
      .autoincrement()
      .primaryKey(),
    username: varchar('username', { length: 32 }).notNull(),
    /** bcrypt 哈希，任何对外返回都必须剔除该字段 */
    password: varchar('password', { length: 100 }).notNull(),
    nickname: varchar('nickname', { length: 32 }),
    email: varchar('email', { length: 128 }),
    phone: varchar('phone', { length: 20 }),
    avatar: varchar('avatar', { length: 255 }),
    status: mysqlEnum('status', USER_STATUS).notNull().default('active'),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('uk_sys_user_username').on(table.username),
    index('idx_sys_user_status').on(table.status),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
/** 对外可见的用户字段，不含 password */
export type SafeUser = Omit<UserRow, 'password'>;
