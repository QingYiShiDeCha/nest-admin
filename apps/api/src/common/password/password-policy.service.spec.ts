import { BadRequestException } from '@nestjs/common';

import {
  PASSWORD_POLICY_DEFAULTS,
  SYSTEM_CONFIG_KEYS,
} from '@nest-admin/shared';

import type { SystemConfigService } from '../../modules/system-config/system-config.service';
import {
  checkPasswordPolicy,
  PasswordPolicyService,
} from './password-policy.service';

/** 只需要 getEnabledValues 一个方法 */
type ConfigStub = Pick<SystemConfigService, 'getEnabledValues'>;

function createService(values: Record<string, unknown>): PasswordPolicyService {
  const stub: ConfigStub = {
    getEnabledValues: jest.fn().mockResolvedValue(values),
  };

  return new PasswordPolicyService(stub as unknown as SystemConfigService);
}

describe('checkPasswordPolicy', () => {
  it('默认策略：8 位以上、含小写字母和数字即通过', () => {
    expect(
      checkPasswordPolicy(PASSWORD_POLICY_DEFAULTS, 'admin123456'),
    ).toEqual([]);
  });

  it('逐项报告不满足项', () => {
    const problems = checkPasswordPolicy(
      {
        minLength: 12,
        requireUpper: true,
        requireLower: true,
        requireDigit: true,
        requireSpecial: true,
      },
      'ab1',
    );

    expect(problems).toEqual([
      '长度至少 12 位',
      '需包含大写字母',
      '需包含特殊字符',
    ]);
  });
});

describe('PasswordPolicyService.resolve', () => {
  it('参数缺省时回落默认策略', async () => {
    const service = createService({});

    await expect(service.resolve()).resolves.toEqual(PASSWORD_POLICY_DEFAULTS);
  });

  it('启用参数覆盖默认值', async () => {
    const service = createService({
      [SYSTEM_CONFIG_KEYS.PASSWORD_MIN_LENGTH]: 12,
      [SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_UPPER]: true,
      [SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_LOWER]: false,
      [SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_DIGIT]: false,
      [SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_SPECIAL]: true,
    });

    await expect(service.resolve()).resolves.toEqual({
      minLength: 12,
      requireUpper: true,
      requireLower: false,
      requireDigit: false,
      requireSpecial: true,
    });
  });

  it('非法值按未配置处理，回落默认', async () => {
    const service = createService({
      [SYSTEM_CONFIG_KEYS.PASSWORD_MIN_LENGTH]: 3,
      [SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_UPPER]: 'yes',
    });

    await expect(service.resolve()).resolves.toEqual(PASSWORD_POLICY_DEFAULTS);
  });
});

describe('PasswordPolicyService.assertSatisfied', () => {
  it('满足策略时直接放行', async () => {
    const service = createService({});

    await expect(
      service.assertSatisfied('admin123456'),
    ).resolves.toBeUndefined();
  });

  it('不满足时抛 400 并汇总原因', async () => {
    const service = createService({
      [SYSTEM_CONFIG_KEYS.PASSWORD_MIN_LENGTH]: 10,
      [SYSTEM_CONFIG_KEYS.PASSWORD_REQUIRE_SPECIAL]: true,
    });

    await expect(service.assertSatisfied('ab12')).rejects.toThrow(
      new BadRequestException(
        '密码不满足安全策略：长度至少 10 位；需包含特殊字符',
      ),
    );
  });
});
