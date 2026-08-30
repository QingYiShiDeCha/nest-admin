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
  /** 给用户分配角色，与改用户资料分开，因为它实际是在授权 */
  USER_ASSIGN_ROLE: 'system:user:assign-role',
  /** 给用户分配岗位，与角色授权分开。 */
  USER_ASSIGN_POST: 'system:user:assign-post',
  /** 查看用户的在线设备。与下线拆开：看是只读，踢是写 */
  USER_SESSION_LIST: 'system:user:session:list',
  /** 强制用户下线：吊销其全部或指定 refreshToken */
  USER_FORCE_LOGOUT: 'system:user:force-logout',

  DEPT_LIST: 'system:dept:list',
  DEPT_READ: 'system:dept:read',
  DEPT_CREATE: 'system:dept:create',
  DEPT_UPDATE: 'system:dept:update',
  DEPT_DELETE: 'system:dept:delete',
  /** 查看部门迁移轨迹，与部门资料查看权限分开。 */
  DEPT_TRANSFER_LIST: 'system:dept:transfer:list',

  POST_LIST: 'system:post:list',
  POST_READ: 'system:post:read',
  POST_CREATE: 'system:post:create',
  POST_UPDATE: 'system:post:update',
  POST_DELETE: 'system:post:delete',

  ROLE_LIST: 'system:role:list',
  ROLE_READ: 'system:role:read',
  ROLE_CREATE: 'system:role:create',
  ROLE_UPDATE: 'system:role:update',
  ROLE_DELETE: 'system:role:delete',
  /** 给角色配置权限码与菜单 */
  ROLE_ASSIGN: 'system:role:assign',

  MENU_LIST: 'system:menu:list',
  MENU_READ: 'system:menu:read',
  MENU_CREATE: 'system:menu:create',
  MENU_UPDATE: 'system:menu:update',
  MENU_DELETE: 'system:menu:delete',

  LOG_LIST: 'system:log:list',
  LOG_READ: 'system:log:read',
  /** 手动触发日志清理 */
  LOG_CLEAN: 'system:log:clean',

  /** 权限码目录只读，供角色授权界面拉取可选项 */
  PERMISSION_LIST: 'system:permission:list',
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
  {
    code: PERMISSIONS.USER_ASSIGN_ROLE,
    name: '给用户分配角色',
    module: 'system',
  },
  {
    code: PERMISSIONS.USER_ASSIGN_POST,
    name: '给用户分配岗位',
    module: 'system',
  },
  {
    code: PERMISSIONS.USER_SESSION_LIST,
    name: '查看用户在线设备',
    module: 'system',
  },
  {
    code: PERMISSIONS.USER_FORCE_LOGOUT,
    name: '强制用户下线',
    module: 'system',
  },
  { code: PERMISSIONS.DEPT_LIST, name: '查询部门树', module: 'system' },
  { code: PERMISSIONS.DEPT_READ, name: '查看部门详情', module: 'system' },
  { code: PERMISSIONS.DEPT_CREATE, name: '新增部门', module: 'system' },
  { code: PERMISSIONS.DEPT_UPDATE, name: '更新部门', module: 'system' },
  { code: PERMISSIONS.DEPT_DELETE, name: '删除部门', module: 'system' },
  {
    code: PERMISSIONS.DEPT_TRANSFER_LIST,
    name: '查看部门迁移记录',
    module: 'system',
  },
  { code: PERMISSIONS.POST_LIST, name: '查询岗位列表', module: 'system' },
  { code: PERMISSIONS.POST_READ, name: '查看岗位详情', module: 'system' },
  { code: PERMISSIONS.POST_CREATE, name: '新增岗位', module: 'system' },
  { code: PERMISSIONS.POST_UPDATE, name: '更新岗位', module: 'system' },
  { code: PERMISSIONS.POST_DELETE, name: '删除岗位', module: 'system' },
  { code: PERMISSIONS.ROLE_LIST, name: '查询角色列表', module: 'system' },
  { code: PERMISSIONS.ROLE_READ, name: '查看角色详情', module: 'system' },
  { code: PERMISSIONS.ROLE_CREATE, name: '新增角色', module: 'system' },
  { code: PERMISSIONS.ROLE_UPDATE, name: '更新角色', module: 'system' },
  { code: PERMISSIONS.ROLE_DELETE, name: '删除角色', module: 'system' },
  {
    code: PERMISSIONS.ROLE_ASSIGN,
    name: '配置角色的权限与菜单',
    module: 'system',
  },
  { code: PERMISSIONS.MENU_LIST, name: '查询菜单树', module: 'system' },
  { code: PERMISSIONS.MENU_READ, name: '查看菜单详情', module: 'system' },
  { code: PERMISSIONS.MENU_CREATE, name: '新增菜单', module: 'system' },
  { code: PERMISSIONS.MENU_UPDATE, name: '更新菜单', module: 'system' },
  { code: PERMISSIONS.MENU_DELETE, name: '删除菜单', module: 'system' },
  { code: PERMISSIONS.LOG_LIST, name: '查询操作日志', module: 'system' },
  { code: PERMISSIONS.LOG_READ, name: '查看日志详情', module: 'system' },
  { code: PERMISSIONS.LOG_CLEAN, name: '手动清理日志', module: 'system' },
  {
    code: PERMISSIONS.PERMISSION_LIST,
    name: '查询权限码目录',
    module: 'system',
  },
];

/**
 * 内置超级管理员的角色码。持有该角色的用户在 PermissionGuard 里直接放行，
 * 不参与权限码比对——否则一旦权限表被清空或配错，管理员会被锁在系统外，
 * 连修复权限的接口都调不了。
 */
export const SUPER_ADMIN_ROLE_CODE = 'super_admin';
