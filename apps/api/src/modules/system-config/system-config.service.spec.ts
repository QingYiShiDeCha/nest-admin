import { BadRequestException } from '@nestjs/common';

import {
  resolveSystemConfigValue,
  validateSystemConfigValue,
} from './system-config.service';

describe('系统参数值类型', () => {
  it.each([
    ['string', '任意文本'],
    ['number', '12.5'],
    ['boolean', 'true'],
    ['boolean', 'false'],
    ['json', '{"enabled":true}'],
    ['json', '[1,2,3]'],
  ] as const)('%s 参数接受合法值', (type, value) => {
    expect(() => validateSystemConfigValue(value, type)).not.toThrow();
  });

  it.each([
    ['number', ''],
    ['number', '12px'],
    ['boolean', '1'],
    ['boolean', 'TRUE'],
    ['json', '{bad}'],
    ['json', 'null'],
    ['json', '123'],
  ] as const)('%s 参数拒绝非法值 %s', (type, value) => {
    expect(() => validateSystemConfigValue(value, type)).toThrow(
      BadRequestException,
    );
  });

  it('按声明类型返回业务可直接使用的值', () => {
    expect(resolveSystemConfigValue('8', 'number')).toBe(8);
    expect(resolveSystemConfigValue('false', 'boolean')).toBe(false);
    expect(resolveSystemConfigValue('{"pageSize":20}', 'json')).toEqual({
      pageSize: 20,
    });
  });
});
