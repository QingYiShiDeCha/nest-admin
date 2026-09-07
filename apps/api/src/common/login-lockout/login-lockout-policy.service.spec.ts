import {
  LOGIN_LOCKOUT_POLICY_DEFAULTS,
  SYSTEM_CONFIG_KEYS,
} from '@nest-admin/shared';

import type { SystemConfigService } from '../../modules/system-config/system-config.service';
import { LoginLockoutPolicyService } from './login-lockout-policy.service';

/** 只需要 getEnabledValues 一个方法 */
type ConfigStub = Pick<SystemConfigService, 'getEnabledValues'>;

function createService(
  values: Record<string, unknown>,
): LoginLockoutPolicyService {
  const stub: ConfigStub = {
    getEnabledValues: jest.fn().mockResolvedValue(values),
  };

  return new LoginLockoutPolicyService(stub as SystemConfigService);
}

describe('LoginLockoutPolicyService.resolve', () => {
  it('参数缺省时回落默认策略：5 次、5 分钟窗口、锁定 15 分钟', async () => {
    await expect(createService({}).resolve()).resolves.toEqual(
      LOGIN_LOCKOUT_POLICY_DEFAULTS,
    );
  });

  it('启用参数覆盖默认值', async () => {
    const service = createService({
      [SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_MAX_FAILURES]: 3,
      [SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_WINDOW_SECONDS]: 60,
      [SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_DURATION_SECONDS]: 3600,
    });

    await expect(service.resolve()).resolves.toEqual({
      maxFailures: 3,
      windowSeconds: 60,
      durationSeconds: 3600,
    });
  });

  it('越界或非法值逐项回落默认', async () => {
    const service = createService({
      // 低于下限 3
      [SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_MAX_FAILURES]: 2,
      // 非正数
      [SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_WINDOW_SECONDS]: 0,
      // 类型不对
      [SYSTEM_CONFIG_KEYS.LOGIN_LOCKOUT_DURATION_SECONDS]: '10m',
    });

    await expect(service.resolve()).resolves.toEqual(
      LOGIN_LOCKOUT_POLICY_DEFAULTS,
    );
  });
});
