/**
 * 与后端接口对齐的类型。
 *
 * 刻意不引 @nest-admin/database：SafeUser 的 d.ts 会传递引用 drizzle-orm，
 * 前端为此要装一整套 ORM 类型。等这些「纯用户形态」的类型积累多了，
 * 再考虑挪进 @nest-admin/shared（它才是给前端用的）。
 */

/** 登录/注册返回的用户体（不含角色权限） */
export interface BasicUser {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status: 'active' | 'disabled';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** /auth/profile 的返回：用户 + 授权信息 */
export interface UserProfile extends BasicUser {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  /** 所属会话标识，用于设备列表标「当前设备」 */
  sessionId: string | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: BasicUser;
}

/** 后端统一的分页响应体 */
export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** sys_role 行（列表页用，不含关联数据） */
export interface Role {
  id: number;
  code: string;
  name: string;
  sort: number;
  status: 'active' | 'disabled';
  dataScope: 'all' | 'dept' | 'dept_and_below' | 'self' | 'custom';
  isSystem: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /roles/:id：角色本体 + 已授权的权限码与菜单 id，供授权界面回显 */
export interface RoleDetail extends Role {
  permissionIds: number[];
  menuIds: number[];
}

/** sys_menu 行（管理端单条），树形版本见 MenuNode */
export interface MenuRecord {
  id: number;
  parentId: number | null;
  name: string;
  type: 'directory' | 'menu' | 'external';
  path: string | null;
  component: string | null;
  icon: string | null;
  sort: number;
  visible: boolean;
  keepAlive: boolean;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

/** 权限码目录项，角色授权界面按 module 分组展示 */
export interface PermissionCatalogItem {
  id: number;
  code: string;
  name: string;
  module: string | null;
}

export type OperationStatus = 'success' | 'failure';

/** sys_operation_log 行。日志 append-only，无审计字段与软删除 */
export interface OperationLog {
  id: number;
  userId: number | null;
  /** 冗余存储：用户删除后日志仍要能回答「是谁做的」 */
  username: string | null;
  module: string | null;
  action: string | null;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  /** 请求参数快照（JSON 字符串，后端已脱敏截断） */
  params: string | null;
  status: OperationStatus;
  statusCode: number | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}
