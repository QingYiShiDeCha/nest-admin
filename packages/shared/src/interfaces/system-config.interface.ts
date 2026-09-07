import type { Status } from '../constants/status';
import type { SystemConfigValueType } from '../constants/system-config';

export interface SystemConfig {
  id: number;
  name: string;
  key: string;
  value: string;
  valueType: SystemConfigValueType;
  status: Status;
  builtIn: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeSystemConfig {
  systemName: string;
  defaultPageSize: number;
}

/**
 * 密码策略。每一项都对应一个内置参数，缺省或参数停用时回落
 * PASSWORD_POLICY_DEFAULTS；api 在所有写入密码的入口统一校验。
 */
export interface SecurityPasswordPolicy {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
}

/**
 * 登录锁定策略。每一项都对应一个内置参数，缺省、停用或值非法时
 * 逐项回落 LOGIN_LOCKOUT_POLICY_DEFAULTS——参数被改坏不能把登录入口弄挂。
 */
export interface LoginLockoutPolicy {
  /** 窗口内累计失败次数达到该值即锁定 */
  maxFailures: number;
  /** 失败计数窗口（秒） */
  windowSeconds: number;
  /** 锁定时长（秒），过期自动解锁 */
  durationSeconds: number;
}
