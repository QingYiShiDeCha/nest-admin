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
