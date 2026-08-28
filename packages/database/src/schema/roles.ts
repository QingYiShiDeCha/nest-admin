import { DATA_SCOPE, STATUS } from '@nest-admin/shared';
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, primaryId } from './columns';

export const roles = mysqlTable(
  'sys_role',
  {
    id: primaryId(),
    /**
     * 角色标识，如 super_admin。软删除后该值仍占用唯一索引，
     * 即已删除的角色码不可复用——权限码会被前端和守卫元数据引用，
     * 复用旧码等于把历史授权语义悄悄还给了新角色。
     */
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    /** 升序排列，值小的在前 */
    sort: int('sort').notNull().default(0),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    /** 数据权限范围，默认取最小权限 */
    dataScope: mysqlEnum('data_scope', DATA_SCOPE).notNull().default('self'),
    /** 内置角色，不允许删除或修改角色码，由 service 层拦截 */
    isSystem: boolean('is_system').notNull().default(false),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_role_code').on(table.code),
    index('idx_sys_role_status').on(table.status),
  ],
);

export type RoleRow = typeof roles.$inferSelect;
export type NewRoleRow = typeof roles.$inferInsert;
