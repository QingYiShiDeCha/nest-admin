import type { LoginLockoutPolicy } from '@nest-admin/shared';
import {
  LOGIN_LOCKOUT_POLICY_CONFIG_KEYS,
  LOGIN_LOCKOUT_POLICY_DEFAULTS,
  SYSTEM_CONFIG_KEYS,
} from '@nest-admin/shared';
import { Injectable } from '@nestjs/common';

import { SystemConfigService } from '../../modules/system-config/system-config.service';

/**
 * 从参数表拼装登录锁定策略。任一键缺省、停用或值非法都回落对应默认值，
 * 保证策略永远可解析——参数被改坏不能把登录入口一起弄挂。
 *
 * 每次登录现读一次参数（单条 IN 查询）：登录是高频但单次代价有界的操作，
 * 换来「参数改完即时生效」，不需要缓存失效链路。
 */
@Injectable()
export class LoginLockoutPolicyService {
  constructor(private readonly configService: SystemConfigService) {}

  async resolve(): Promise<LoginLockoutPolicy> {
    const values = await this.configService.getEnabledValues(
      LOGIN_LOCKOUT_POLICY_CONFIG_KEYS,
    );

    return {
      maxFailures: pickMaxFailures(values),
      windowSeconds: pickSeconds(
        values,
        SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_WINDOW_SECONDS,
        LOGIN_LOCKOUT_POLICY_DEFAULTS.windowSeconds,
      ),
      durationSeconds: pickSeconds(
        values,
        SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_DURATION_SECONDS,
        LOGIN_LOCKOUT_POLICY_DEFAULTS.durationSeconds,
      ),
    };
  }
}

function pickMaxFailures(values: Record<string, unknown>): number {
  const raw = values[SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_MAX_FAILURES];

  if (
    typeof raw === 'number' &&
    Number.isInteger(raw) &&
    raw >= 3 &&
    raw <= 10
  ) {
    return raw;
  }

  return LOGIN_LOCKOUT_POLICY_DEFAULTS.maxFailures;
}

function pickSeconds(
  values: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const raw = values[key];

  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw;
  }

  return fallback;
}
