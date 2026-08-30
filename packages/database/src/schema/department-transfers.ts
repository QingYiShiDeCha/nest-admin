import { index, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

import { foreignId, primaryId } from './columns';

/**
 * 部门迁移历史只追加、不更新、不删除。名称使用快照，关联对象变化后历史仍可读。
 */
export const departmentTransfers = mysqlTable(
  'sys_dept_transfer_log',
  {
    id: primaryId(),
    deptId: foreignId('dept_id').notNull(),
    deptName: varchar('dept_name', { length: 64 }).notNull(),
    fromParentId: foreignId('from_parent_id'),
    fromParentName: varchar('from_parent_name', { length: 64 }),
    toParentId: foreignId('to_parent_id'),
    toParentName: varchar('to_parent_name', { length: 64 }),
    reason: varchar('reason', { length: 255 }).notNull(),
    operatorId: foreignId('operator_id'),
    operatorName: varchar('operator_name', { length: 64 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_sys_dept_transfer_dept_created').on(
      table.deptId,
      table.createdAt,
    ),
    index('idx_sys_dept_transfer_operator_id').on(table.operatorId),
  ],
);

export type DepartmentTransferRow = typeof departmentTransfers.$inferSelect;
export type NewDepartmentTransferRow = typeof departmentTransfers.$inferInsert;
