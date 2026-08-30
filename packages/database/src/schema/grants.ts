import { index, mysqlTable, primaryKey } from 'drizzle-orm/mysql-core';

import { foreignId, grantColumns } from './columns';
import { departments } from './departments';
import { menus } from './menus';
import { permissions } from './permissions';
import { roles } from './roles';
import { users } from './users';

/**
 * 授权关联表都用联合主键而不是自增 id：
 * 一对绑定关系天然唯一，联合主键顺带就是防重复授权的约束。
 *
 * 外键都带 onDelete cascade——主表虽然走软删除，级联极少触发，
 * 但一旦真的物理清理数据，授权关系不会留下悬空引用。
 */
export const userRoles = mysqlTable(
  'sys_user_role',
  {
    userId: foreignId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: foreignId('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    ...grantColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    // 反查「某角色下有哪些用户」，联合主键的最左前缀帮不上忙
    index('idx_sys_user_role_role_id').on(table.roleId),
  ],
);

export const rolePermissions = mysqlTable(
  'sys_role_permission',
  {
    roleId: foreignId('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: foreignId('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    ...grantColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index('idx_sys_role_permission_permission_id').on(table.permissionId),
  ],
);

export const roleMenus = mysqlTable(
  'sys_role_menu',
  {
    roleId: foreignId('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    menuId: foreignId('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    ...grantColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.menuId] }),
    index('idx_sys_role_menu_menu_id').on(table.menuId),
  ],
);

export const roleDepartments = mysqlTable(
  'sys_role_dept',
  {
    roleId: foreignId('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    deptId: foreignId('dept_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    ...grantColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.deptId] }),
    index('idx_sys_role_dept_dept_id').on(table.deptId),
  ],
);

export type UserRoleRow = typeof userRoles.$inferSelect;
export type RolePermissionRow = typeof rolePermissions.$inferSelect;
export type RoleMenuRow = typeof roleMenus.$inferSelect;
export type RoleDepartmentRow = typeof roleDepartments.$inferSelect;
