import { relations } from 'drizzle-orm';

import { roleMenus, rolePermissions, userRoles } from './grants';
import { menus } from './menus';
import { permissions } from './permissions';
import { roles } from './roles';
import { users } from './users';

/**
 * 关系声明，用于 Drizzle 的关联查询 API，例如
 * db.query.users.findFirst({ with: { userRoles: { with: { role: true } } } })。
 * 这些声明只影响查询构建，不产生任何建表 SQL。
 */

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
  roleMenus: many(roleMenus),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const menusRelations = relations(menus, ({ one, many }) => ({
  parent: one(menus, {
    fields: [menus.parentId],
    references: [menus.id],
    relationName: 'menu_tree',
  }),
  children: many(menus, { relationName: 'menu_tree' }),
  roleMenus: many(roleMenus),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);

export const roleMenusRelations = relations(roleMenus, ({ one }) => ({
  role: one(roles, { fields: [roleMenus.roleId], references: [roles.id] }),
  menu: one(menus, { fields: [roleMenus.menuId], references: [menus.id] }),
}));
