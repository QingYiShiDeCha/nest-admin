import type { SafeUser } from '@nest-admin/database';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  /** 用户 id */
  sub: number;
  username: string;
  /** 区分 access / refresh，避免拿 accessToken 去换新 token */
  type: TokenType;
  /**
   * 仅 refreshToken 有。对应 sys_refresh_token.jti，
   * 刷新时靠它查库判断是否已被吊销——accessToken 保持无状态。
   */
  jti?: string;
  /**
   * 仅 accessToken 有，值等于它所属会话的 refreshToken jti。
   * 鉴权时用它确认会话仍有效，同时在会话列表标出「当前设备」。
   */
  sid?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: SafeUser;
}
