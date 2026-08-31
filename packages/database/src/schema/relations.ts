import { relations } from 'drizzle-orm';

import { departments } from './departments';
import { dictionaryItems, dictionaryTypes } from './dictionaries';
import {
  roleDepartments,
  roleMenus,
  rolePermissions,
  userRoles,
} from './grants';
import { menus } from './menus';
import { noticeRecipients } from './notice-recipients';
import { noticeTargets } from './notice-targets';
import { notices } from './notices';
import { permissions } from './permissions';
import { posts } from './posts';
import { roles } from './roles';
import { userPosts } from './user-posts';
import { users } from './users';

/**
 * 关系声明，用于 Drizzle 的关联查询 API，例如
 * db.query.users.findFirst({ with: { userRoles: { with: { role: true } } } })。
 * 这些声明只影响查询构建，不产生任何建表 SQL。
 */

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.deptId],
    references: [departments.id],
    relationName: 'department_members',
  }),
  leadingDepartments: many(departments, {
    relationName: 'department_leaders',
  }),
  userPosts: many(userPosts),
  userRoles: many(userRoles),
  noticeRecipients: many(noticeRecipients),
}));

export const noticesRelations = relations(notices, ({ many }) => ({
  targets: many(noticeTargets),
  recipients: many(noticeRecipients),
}));

export const noticeTargetsRelations = relations(noticeTargets, ({ one }) => ({
  notice: one(notices, {
    fields: [noticeTargets.noticeId],
    references: [notices.id],
  }),
}));

export const noticeRecipientsRelations = relations(
  noticeRecipients,
  ({ one }) => ({
    notice: one(notices, {
      fields: [noticeRecipients.noticeId],
      references: [notices.id],
    }),
    user: one(users, {
      fields: [noticeRecipients.userId],
      references: [users.id],
    }),
  }),
);

export const postsRelations = relations(posts, ({ many }) => ({
  userPosts: many(userPosts),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
  roleMenus: many(roleMenus),
  roleDepartments: many(roleDepartments),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  parent: one(departments, {
    fields: [departments.parentId],
    references: [departments.id],
    relationName: 'department_tree',
  }),
  children: many(departments, { relationName: 'department_tree' }),
  leader: one(users, {
    fields: [departments.leaderId],
    references: [users.id],
    relationName: 'department_leaders',
  }),
  users: many(users, { relationName: 'department_members' }),
  roleDepartments: many(roleDepartments),
}));

export const dictionaryTypesRelations = relations(
  dictionaryTypes,
  ({ many }) => ({
    items: many(dictionaryItems),
  }),
);

export const dictionaryItemsRelations = relations(
  dictionaryItems,
  ({ one }) => ({
    type: one(dictionaryTypes, {
      fields: [dictionaryItems.typeId],
      references: [dictionaryTypes.id],
    }),
  }),
);

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

export const userPostsRelations = relations(userPosts, ({ one }) => ({
  user: one(users, { fields: [userPosts.userId], references: [users.id] }),
  post: one(posts, { fields: [userPosts.postId], references: [posts.id] }),
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

export const roleDepartmentsRelations = relations(
  roleDepartments,
  ({ one }) => ({
    role: one(roles, {
      fields: [roleDepartments.roleId],
      references: [roles.id],
    }),
    department: one(departments, {
      fields: [roleDepartments.deptId],
      references: [departments.id],
    }),
  }),
);
