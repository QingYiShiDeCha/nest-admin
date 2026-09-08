import type { SecurityPasswordPolicy } from '@nest-admin/shared';
import {
  PASSWORD_MAX_AGE_DAYS_DEFAULT,
  PASSWORD_MAX_AGE_DAYS_RANGE,
  PASSWORD_MIN_LENGTH_RANGE,
  PASSWORD_POLICY_CONFIG_KEYS,
  PASSWORD_POLICY_DEFAULTS,
  PASSWORD_REQUIRE_KEYS,
  SYSTEM_CONFIG_KEYS,
} from '@nest-admin/shared';
import { BadRequestException, Injectable } from '@nestjs/common';

import { SystemConfigService } from '../../modules/system-config/system-config.service';

/**
 * 从参数表拼装密码策略。任一键缺省、停用或值非法都回落对应默认值，
 * 保证策略永远可解析——参数被改坏不能把改密入口一起弄挂。
 *
 * 每次校验现读一次参数（单条 IN 查询）：改密/建用户都是低频操作，
 * 换来「参数改完即时生效」，不需要缓存失效链路。
 */
@Injectable()
export class PasswordPolicyService {
  constructor(private readonly configService: SystemConfigService) {}

  async resolve(): Promise<SecurityPasswordPolicy> {
    const values = await this.configService.getEnabledValues(
      PASSWORD_POLICY_CONFIG_KEYS,
    );

    return {
      minLength: pickMinLength(values),
      requireUpper: pickRequire(
        values,
        SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_UPPER,
      ),
      requireLower: pickRequire(
        values,
        SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_LOWER,
      ),
      requireDigit: pickRequire(
        values,
        SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_DIGIT,
      ),
      requireSpecial: pickRequire(
        values,
        SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_SPECIAL,
      ),
    };
  }

  /** 所有写入密码的入口（创建用户、修改密码）都调它，不满足直接 400 */
  async assertSatisfied(password: string): Promise<void> {
    const policy = await this.resolve();
    const problems = checkPasswordPolicy(policy, password);

    if (problems.length > 0) {
      throw new BadRequestException(
        `密码不满足安全策略：${problems.join('；')}`,
      );
    }
  }

  /**
   * 登录/profile 的强制改密判定：初始密码（从未设置过修改时间）始终要求改，
   * 与有效期是否开启无关；否则按 `max_age_days` 比较，0 表示不过期。
   */
  async isChangeRequired(passwordChangedAt: Date | null): Promise<boolean> {
    if (passwordChangedAt === null) return true;

    const maxAgeDays = await this.readMaxAgeDays();
    if (maxAgeDays === 0) return false;

    const ageMs = Date.now() - passwordChangedAt.getTime();

    return ageMs > maxAgeDays * 86_400_000;
  }

  private async readMaxAgeDays(): Promise<number> {
    const values = await this.configService.getEnabledValues([
      SYSTEM_CONFIG_KEYS.PASSWORD_MAX_AGE_DAYS,
    ]);
    const raw = values[SYSTEM_CONFIG_KEYS.PASSWORD_MAX_AGE_DAYS];

    if (
      typeof raw === 'number' &&
      Number.isInteger(raw) &&
      raw >= PASSWORD_MAX_AGE_DAYS_RANGE.min &&
      raw <= PASSWORD_MAX_AGE_DAYS_RANGE.max
    ) {
      return raw;
    }

    return PASSWORD_MAX_AGE_DAYS_DEFAULT;
  }
}

/** 逐条产出「不满足项」的可读描述，空数组即通过。纯函数便于单测 */
export function checkPasswordPolicy(
  policy: SecurityPasswordPolicy,
  password: string,
): string[] {
  const problems: string[] = [];

  if (password.length < policy.minLength) {
    problems.push(`长度至少 ${policy.minLength} 位`);
  }
  if (policy.requireUpper && !/[A-Z]/.test(password)) {
    problems.push('需包含大写字母');
  }
  if (policy.requireLower && !/[a-z]/.test(password)) {
    problems.push('需包含小写字母');
  }
  if (policy.requireDigit && !/\d/.test(password)) {
    problems.push('需包含数字');
  }
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    problems.push('需包含特殊字符');
  }

  return problems;
}

function pickMinLength(values: Record<string, unknown>): number {
  const raw = values[SYSTEM_CONFIG_KEYS.PASSWORD_MIN_LENGTH];

  if (
    typeof raw === 'number' &&
    Number.isInteger(raw) &&
    raw >= PASSWORD_MIN_LENGTH_RANGE.min &&
    raw <= PASSWORD_MIN_LENGTH_RANGE.max
  ) {
    return raw;
  }

  return PASSWORD_POLICY_DEFAULTS.minLength;
}

function pickRequire(
  values: Record<string, unknown>,
  key: (typeof PASSWORD_REQUIRE_KEYS)[number],
): boolean {
  const raw = values[key];

  return typeof raw === 'boolean'
    ? raw
    : PASSWORD_POLICY_DEFAULTS[keyToField(key)];
}

/** 参数键与策略字段的映射是机械的一一对应，靠表驱动省掉手写分支 */
function keyToField(
  key: (typeof PASSWORD_REQUIRE_KEYS)[number],
): 'requireUpper' | 'requireLower' | 'requireDigit' | 'requireSpecial' {
  switch (key) {
    case SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_UPPER:
      return 'requireUpper';
    case SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_LOWER:
      return 'requireLower';
    case SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_DIGIT:
      return 'requireDigit';
    case SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_SPECIAL:
      return 'requireSpecial';
  }
}
