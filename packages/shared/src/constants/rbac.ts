/** 角色的数据权限范围，由用户查询层转换为部门与创建人过滤条件。 */
export const DATA_SCOPE = [
  /** 全部数据 */
  'all',
  /** 本部门 */
  'dept',
  /** 本部门及下级 */
  'dept_and_below',
  /** 仅本人 */
  'self',
  /** 自定义部门集合 */
  'custom',
] as const;

export type DataScope = (typeof DATA_SCOPE)[number];

/**
 * 菜单节点类型。按钮级权限不在这里，走 sys_permission 表。
 */
export const MENU_TYPE = [
  /** 目录，只用于分组，不对应页面 */
  'directory',
  /** 菜单，对应一个前端路由与组件 */
  'menu',
  /** 外链，直接跳转 path */
  'external',
] as const;

export type MenuType = (typeof MENU_TYPE)[number];
