import { MENU_TYPE, STATUS } from '@nest-admin/shared';
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';

import { auditColumns, foreignId, primaryId } from './columns';

/**
 * 前端路由菜单树，只负责「看得见什么」，不负责「能做什么」。
 * 接口级鉴权走 sys_permission。
 */
export const menus = mysqlTable(
  'sys_menu',
  {
    id: primaryId(),
    /**
     * 父节点，null 表示根。
     * 这里不加自引用外键：软删除下父行依然存在，外键约束保护不了树的完整性，
     * 「删除目录时子节点怎么办」只能由 service 层决定（级联软删或阻止删除）。
     */
    parentId: foreignId('parent_id'),
    name: varchar('name', { length: 64 }).notNull(),
    type: mysqlEnum('type', MENU_TYPE).notNull().default('menu'),
    /** 路由路径，external 类型时存完整 URL */
    path: varchar('path', { length: 255 }),
    /** 前端组件路径，目录类型为空 */
    component: varchar('component', { length: 255 }),
    icon: varchar('icon', { length: 64 }),
    sort: int('sort').notNull().default(0),
    /** 是否在侧边栏展示，false 时路由仍可访问（如详情页） */
    visible: boolean('visible').notNull().default(true),
    /** 前端是否缓存该页面 */
    keepAlive: boolean('keep_alive').notNull().default(false),
    status: mysqlEnum('status', STATUS).notNull().default('active'),
    ...auditColumns(),
  },
  (table) => [
    index('idx_sys_menu_parent_id').on(table.parentId),
    index('idx_sys_menu_status').on(table.status),
  ],
);

export type MenuRow = typeof menus.$inferSelect;
export type NewMenuRow = typeof menus.$inferInsert;
