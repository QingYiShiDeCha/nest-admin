import type { SafeUser } from '@nest-admin/database';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  /** 用户 id */
  sub: number;
  username: string;
  /** 区分 access / refresh，避免拿 accessToken 去换新 token */
  type: TokenType;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: SafeUser;
}
