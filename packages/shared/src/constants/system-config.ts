import type {
  LoginLockoutPolicy,
  SecurityPasswordPolicy,
} from '../interfaces/system-config.interface';

export const SYSTEM_CONFIG_VALUE_TYPE = [
  'string',
  'number',
  'boolean',
  'json',
] as const;

export type SystemConfigValueType = (typeof SYSTEM_CONFIG_VALUE_TYPE)[number];

export const DEFAULT_SYSTEM_NAME = 'Nest Admin';

export const SYSTEM_CONFIG_KEYS = {
  SYSTEM_NAME: 'system.name',
  DEFAULT_PAGE_SIZE: 'system.pagination.default_page_size',

  /** 密码最小长度 */
  PASSWORD_MIN_LENGTH: 'security.password.min_length',
  /** 密码最大有效期（天），0 表示不过期 */
  PASSWORD_MAX_AGE_DAYS: 'security.password.max_age_days',
  /** 密码必须包含大写字母 */
  PASSWORD_REQUIRE_UPPER: 'security.password.require_upper',
  /** 密码必须包含小写字母 */
  PASSWORD_REQUIRE_LOWER: 'security.password.require_lower',
  /** 密码必须包含数字 */
  PASSWORD_REQUIRE_DIGIT: 'security.password.require_digit',
  /** 密码必须包含特殊字符 */
  PASSWORD_REQUIRE_SPECIAL: 'security.password.require_special',

  /** 登录失败锁定阈值：达到该次数后锁定账号 */
  LOGIN_LOCKOUT_MAX_FAILURES: 'security.login.lockout.max_failures',
  /** 登录失败计数窗口（秒）：超出窗口的失败不再累计 */
  LOGIN_LOCKOUT_WINDOW_SECONDS: 'security.login.lockout.window_seconds',
  /** 账号锁定时长（秒）：过期后自动解锁 */
  LOGIN_LOCKOUT_DURATION_SECONDS: 'security.login.lockout.duration_seconds',
} as const;

export type SystemConfigKey =
  (typeof SYSTEM_CONFIG_KEYS)[keyof typeof SYSTEM_CONFIG_KEYS];

/** 密码最小长度的可配置区间，硬边界——DTO 与参数校验共用 */
export const PASSWORD_MIN_LENGTH_RANGE = { min: 6, max: 64 } as const;

/** 密码有效期（天）的可配置区间，0 在语义上表示不过期 */
export const PASSWORD_MAX_AGE_DAYS_RANGE = { min: 0, max: 3650 } as const;

/** 参数缺省或停用时的密码有效期：0 天即不启用过期检查 */
export const PASSWORD_MAX_AGE_DAYS_DEFAULT = 0;

/** 参数缺省或停用时的密码策略，与历史行为一致：8 位以上、字母加数字 */
export const PASSWORD_POLICY_DEFAULTS: SecurityPasswordPolicy = {
  minLength: 8,
  requireUpper: false,
  requireLower: true,
  requireDigit: true,
  requireSpecial: false,
};

/** 构成密码策略的布尔参数键，seed 与批量校验共用 */
export const PASSWORD_REQUIRE_KEYS = [
  SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_UPPER,
  SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_LOWER,
  SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_DIGIT,
  SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_SPECIAL,
] as const;

/** 密码策略相关的全部参数键，业务侧按批读取用 */
export const PASSWORD_POLICY_CONFIG_KEYS = [
  SYSTEM_CONFIG_KEYS.PASSWORD_MIN_LENGTH,
  ...PASSWORD_REQUIRE_KEYS,
] as const;

/** 登录失败锁定阈值可配置区间，硬边界——DTO 与参数校验共用 */
export const LOGIN_LOCKOUT_MAX_FAILURES_RANGE = { min: 3, max: 10 } as const;
/** 登录失败计数窗口可配置区间（秒） */
export const LOGIN_LOCKOUT_WINDOW_SECONDS_RANGE = {
  min: 60,
  max: 3600,
} as const;
/** 账号锁定时长可配置区间（秒） */
export const LOGIN_LOCKOUT_DURATION_SECONDS_RANGE = {
  min: 60,
  max: 86_400,
} as const;

/** 参数缺省或停用时的登录锁定策略：5 次失败、5 分钟窗口、锁定 15 分钟 */
export const LOGIN_LOCKOUT_POLICY_DEFAULTS: LoginLockoutPolicy = {
  maxFailures: 5,
  windowSeconds: 300,
  durationSeconds: 900,
};

/** 登录锁定策略相关的全部参数键，业务侧按批读取用 */
export const LOGIN_LOCKOUT_POLICY_CONFIG_KEYS = [
  SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_MAX_FAILURES,
  SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_WINDOW_SECONDS,
  SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_DURATION_SECONDS,
] as const;
