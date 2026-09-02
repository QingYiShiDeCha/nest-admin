import type { LoginStatus } from '../constants/login';

/** 登录日志的线上格式契约。 */
export interface LoginLog {
  id: number;
  userId: number | null;
  username: string;
  ip: string | null;
  userAgent: string | null;
  status: LoginStatus;
  failureReason: string | null;
  createdAt: string;
}
