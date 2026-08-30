import { STATUS } from '@nest-admin/shared';
import {
  type AnyMySqlColumn,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, foreignId, primaryId } from './columns';
import { users } from './users';

export const departments = mysqlTable(
  'sys_dept',
  {
    id: primaryId(),
    /** null 表示顶级部门；树完整性与环检测由 service 负责。 */
    parentId: foreignId('parent_id'),
    name: varchar('name', { length: 64 }).notNull(),
    /** 稳定业务标识，软删除后不允许复用。 */
    code: varchar('code', { length: 64 }).notNull(),
    leaderId: foreignId('leader_id').references(
      (): AnyMySqlColumn => users.id,
      { onDelete: 'set null' },
    ),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 128 }),
    sort: int('sort').notNull().default(0),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_dept_code').on(table.code),
    index('idx_sys_dept_parent_id').on(table.parentId),
    index('idx_sys_dept_leader_id').on(table.leaderId),
    index('idx_sys_dept_status').on(table.status),
  ],
);

export type DepartmentRow = typeof departments.$inferSelect;
export type NewDepartmentRow = typeof departments.$inferInsert;
