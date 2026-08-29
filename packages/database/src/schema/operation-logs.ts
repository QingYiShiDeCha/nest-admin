import { OPERATION_STATUS, type OperationStatus } from '@nest-admin/shared';
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

import { foreignId, primaryId } from './columns';

// 枚举的单一来源在 shared（与 MENU_TYPE/STATUS 一致），
// 这里转发导出，让既有从 database 引它的代码不受影响
export { OPERATION_STATUS, type OperationStatus };

/**
 * 操作日志。append-only，没有软删除也没有 created_by/updated_by——
 * 日志本身就是「谁在何时做了什么」的记录，再套一层审计字段是循环。
 * 清理历史数据靠按 created_at 批量物理删除。
 */
export const operationLogs = mysqlTable(
  'sys_operation_log',
  {
    id: primaryId(),
    /** 操作人 id，未登录时为空（如登录失败） */
    userId: foreignId('user_id'),
    /**
     * 冗余存一份用户名。用户被删除后 user_id 仍在但查不到人，
     * 日志必须能独立回答「是谁做的」，所以这里不做外键关联。
     */
    username: varchar('username', { length: 32 }),
    /** 业务模块，来自 @OperationLog 装饰器 */
    module: varchar('module', { length: 64 }),
    /** 操作描述，来自 @OperationLog 装饰器 */
    action: varchar('action', { length: 64 }),
    method: varchar('method', { length: 10 }).notNull(),
    path: varchar('path', { length: 255 }).notNull(),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
    /** 请求参数快照，已脱敏并截断 */
    params: text('params'),
    status: mysqlEnum('status', OPERATION_STATUS).notNull(),
    /** HTTP 状态码，失败时便于快速筛选 */
    statusCode: int('status_code'),
    errorMessage: varchar('error_message', { length: 500 }),
    /** 耗时，毫秒 */
    durationMs: int('duration_ms'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_sys_operation_log_user_id').on(table.userId),
    // 列表默认按时间倒序翻页，清理历史也按时间范围删
    index('idx_sys_operation_log_created_at').on(table.createdAt),
    index('idx_sys_operation_log_status').on(table.status),
  ],
);

export type OperationLogRow = typeof operationLogs.$inferSelect;
export type NewOperationLogRow = typeof operationLogs.$inferInsert;
