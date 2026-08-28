import {
  index,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, primaryId } from './columns';

/**
 * 按钮级/接口级权限码，与菜单树解耦。
 * 守卫读 @Permissions('system:user:delete') 元数据后与此表比对。
 */
export const permissions = mysqlTable(
  'sys_permission',
  {
    id: primaryId(),
    /** 形如 system:user:delete，删除后同样不可复用，理由见 sys_role.code */
    code: varchar('code', { length: 128 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    /** 归属模块，用于权限分配界面分组展示，如 system / monitor */
    module: varchar('module', { length: 64 }),
    description: varchar('description', { length: 255 }),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex('uk_sys_permission_code').on(table.code),
    index('idx_sys_permission_module').on(table.module),
  ],
);

export type PermissionRow = typeof permissions.$inferSelect;
export type NewPermissionRow = typeof permissions.$inferInsert;
