import {
  index,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { foreignId, primaryId } from './columns';
import { users } from './users';

/**
 * refreshToken 的签发记录，把原本无状态的刷新变成可吊销的。
 *
 * 存的是 JWT 的 jti（随机 UUID）而不是 token 本身：token 是 bearer 凭证，
 * 落库等于多一处泄漏面，而校验签名这一步已经由 JWT 自己完成，
 * 这张表只回答「这个 jti 还有效吗」。
 */
export const refreshTokens = mysqlTable(
  'sys_refresh_token',
  {
    id: primaryId(),
    userId: foreignId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** JWT 的 jti claim */
    jti: varchar('jti', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    /** 非空表示已吊销：主动登出、改密、被踢下线、或轮换后作废 */
    revokedAt: timestamp('revoked_at'),
    /**
     * 轮换后接替它的新 jti。留着这条链是为了盗用检测：
     * 一个已被轮换掉的 token 再次出现，说明它被人复制走了。
     */
    replacedByJti: varchar('replaced_by_jti', { length: 64 }),
    /** 签发时的客户端信息，用于「登录设备列表」和排查异常登录 */
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uk_sys_refresh_token_jti').on(table.jti),
    index('idx_sys_refresh_token_user_id').on(table.userId),
    // 清理过期记录时按这个字段扫
    index('idx_sys_refresh_token_expires_at').on(table.expiresAt),
  ],
);

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type NewRefreshTokenRow = typeof refreshTokens.$inferInsert;
