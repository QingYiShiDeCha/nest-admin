import type {
  LoginPayload,
  LoginResult,
  UserProfile,
} from '@/api/types';
import { httpGet, httpPost } from '@/api/http';

/** 认证相关接口。登录/注册的响应里已带 token，调用方负责 saveTokens */
export function apiLogin(payload: LoginPayload): Promise<LoginResult> {
  return httpPost<LoginResult>('/auth/login', payload);
}

export function apiRegister(payload: {
  username: string;
  password: string;
  nickname?: string;
}): Promise<LoginResult> {
  return httpPost<LoginResult>('/auth/register', payload);
}

/** 登出只影响当前会话；后端对无效令牌也返回成功，前端无需区分 */
export function apiLogout(refreshToken: string): Promise<void> {
  return httpPost<void>('/auth/logout', { refreshToken });
}

export function apiProfile(): Promise<UserProfile> {
  return httpGet<UserProfile>('/auth/profile');
}
