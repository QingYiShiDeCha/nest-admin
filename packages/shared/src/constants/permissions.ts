/**
 * 权限码的单一来源。
 *
 * 这份清单同时被三处消费：controller 上的 @Permissions() 标注、
 * seed 录入 sys_permission 表、以及前端的按钮级控制。
 * 三者必须一致，所以码值只在这里定义一次，不允许在别处写字面量。
 *
 * 命名约定 模块:资源:动作，全小写，冒号分隔。
 */
export const PERMISSIONS = {
  USER_LIST: 'system:user:list',
  USER_READ: 'system:user:read',
  USER_CREATE: 'system:user:create',
  USER_UPDATE: 'system:user:update',
  USER_DELETE: 'system:user:delete',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  code: PermissionCode;
  name: string;
  module: string;
}

/** seed 依据此清单幂等地写入 sys_permission，新增权限码时同步补一条 */
export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  { code: PERMISSIONS.USER_LIST, name: '查询用户列表', module: 'system' },
  { code: PERMISSIONS.USER_READ, name: '查看用户详情', module: 'system' },
  { code: PERMISSIONS.USER_CREATE, name: '新增用户', module: 'system' },
  { code: PERMISSIONS.USER_UPDATE, name: '更新用户', module: 'system' },
  { code: PERMISSIONS.USER_DELETE, name: '删除用户', module: 'system' },
];

/**
 * 内置超级管理员的角色码。持有该角色的用户在 PermissionGuard 里直接放行，
 * 不参与权限码比对——否则一旦权限表被清空或配错，管理员会被锁在系统外，
 * 连修复权限的接口都调不了。
 */
export const SUPER_ADMIN_ROLE_CODE = 'super_admin';
