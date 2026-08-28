import type { SafeUser } from '@nest-admin/database';

/**
 * JwtStrategy.validate 挂到 request 上的对象，比 SafeUser 多出授权信息。
 * PermissionGuard 依赖 isSuperAdmin 与 permissions，
 * /auth/profile 把它整个返回给前端做菜单与按钮控制。
 */
export interface AuthUser extends SafeUser {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}
