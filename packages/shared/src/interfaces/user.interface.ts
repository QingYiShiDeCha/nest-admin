/**
 * 用户相关的「线上格式」契约：接口报文里实际的字段形状。
 *
 * 这份文件刻意不引用 @nest-admin/database——它的类型传递依赖 drizzle-orm，
 * 前端引它就得装一整套 ORM 类型。代价是行类型（Date 时间戳）与线上类型
 * （ISO 字符串）之间没有自动的编译期桥，靠 api 侧 wire-contract.ts 里的
 * Serialized 断言把两者钉在一起：数据库列一变，那里先编译失败。
 *
 * 字段集合是「客户端消费的子集」：响应里可能还有 createdBy 等审计字段，
 * 不在这里声明只意味着客户端不依赖它们，多余字段在运行时被忽略。
 */

/** 登录/注册返回的用户体（不含角色权限） */
export interface BasicUser {
  id: number;
  deptId: number | null;
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

/** 用户管理列表在基础用户信息上补充已分配岗位名称。 */
export interface UserListItem extends BasicUser {
  postNames: string[];
}

/** /auth/profile 的返回：用户 + 授权信息 */
export interface UserProfile extends BasicUser {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  /** 所属会话标识，用于设备列表标「当前设备」 */
  sessionId: string | null;
}

/** 当前用户可自行维护的基础资料；null 表示清空对应字段。 */
export interface UpdateOwnProfilePayload {
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
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
