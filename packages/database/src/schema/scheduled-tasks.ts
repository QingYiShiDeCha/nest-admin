import {
  SCHEDULED_TASK_EXECUTION_STATUS,
  SCHEDULED_TASK_TRIGGER_TYPE,
  STATUS,
} from '@nest-admin/shared';
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, foreignId, primaryId } from './columns';

export const scheduledTasks = mysqlTable(
  'sys_scheduled_task',
  {
    id: primaryId(),
    name: varchar('name', { length: 64 }).notNull(),
    /** 内置计划的稳定标识；自定义计划为空，MySQL 唯一索引允许多个 null。 */
    code: varchar('code', { length: 128 }),
    /** 只允许引用后端任务注册表中的稳定键，不保存任意代码。 */
    taskKey: varchar('task_key', { length: 128 }).notNull(),
    cronExpression: varchar('cron_expression', { length: 64 }).notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull(),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    /** 内置任务允许调度配置，但不可改任务键或删除。 */
    builtIn: boolean('built_in').notNull().default(false),
    remark: varchar('remark', { length: 255 }),
    lastRunAt: timestamp('last_run_at'),
    lastRunStatus: mysqlEnum(
      'last_run_status',
      SCHEDULED_TASK_EXECUTION_STATUS,
    ),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_scheduled_task_code').on(table.code),
    index('idx_sys_scheduled_task_key').on(table.taskKey),
    index('idx_sys_scheduled_task_status').on(table.status),
  ],
);

export const scheduledTaskLogs = mysqlTable(
  'sys_scheduled_task_log',
  {
    id: primaryId(),
    taskId: foreignId('task_id').notNull(),
    /** 任务删除或改名后，历史仍能独立说明当时执行了什么。 */
    taskName: varchar('task_name', { length: 64 }).notNull(),
    taskKey: varchar('task_key', { length: 128 }).notNull(),
    triggerType: mysqlEnum(
      'trigger_type',
      SCHEDULED_TASK_TRIGGER_TYPE,
    ).notNull(),
    status: mysqlEnum('status', SCHEDULED_TASK_EXECUTION_STATUS).notNull(),
    operatorId: foreignId('operator_id'),
    operatorUsername: varchar('operator_username', { length: 32 }),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    finishedAt: timestamp('finished_at'),
    durationMs: int('duration_ms'),
    result: text('result'),
    errorMessage: varchar('error_message', { length: 1000 }),
  },
  (table) => [
    index('idx_sys_scheduled_task_log_task_started').on(
      table.taskId,
      table.startedAt,
    ),
    index('idx_sys_scheduled_task_log_status').on(table.status),
    index('idx_sys_scheduled_task_log_started_at').on(table.startedAt),
  ],
);

export type ScheduledTaskRow = typeof scheduledTasks.$inferSelect;
export type NewScheduledTaskRow = typeof scheduledTasks.$inferInsert;
export type ScheduledTaskLogRow = typeof scheduledTaskLogs.$inferSelect;
export type NewScheduledTaskLogRow = typeof scheduledTaskLogs.$inferInsert;
