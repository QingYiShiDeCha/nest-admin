import { BadRequestException } from '@nestjs/common';

import {
  resolveRuntimeSystemConfig,
  resolveSystemConfigValue,
  validateKnownSystemConfigValue,
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

  it('将启用的内置参数解析为前端运行时配置', () => {
    expect(
      resolveRuntimeSystemConfig([
        {
          key: 'system.name',
          value: '运营管理平台',
          valueType: 'string',
        },
        {
          key: 'system.pagination.default_page_size',
          value: '25',
          valueType: 'number',
        },
      ]),
    ).toEqual({ systemName: '运营管理平台', defaultPageSize: 25 });
  });

  it('运行时参数缺失或历史值非法时使用安全默认值', () => {
    expect(
      resolveRuntimeSystemConfig([
        { key: 'system.name', value: '  ', valueType: 'string' },
        {
          key: 'system.pagination.default_page_size',
          value: '200',
          valueType: 'number',
        },
      ]),
    ).toEqual({ systemName: 'Nest Admin', defaultPageSize: 10 });
  });

  it('拒绝不符合业务约束的内置参数值', () => {
    expect(() =>
      validateKnownSystemConfigValue('system.name', '', 'string'),
    ).toThrow(BadRequestException);
    expect(() =>
      validateKnownSystemConfigValue(
        'system.pagination.default_page_size',
        '101',
        'number',
      ),
    ).toThrow(BadRequestException);
  });
});
