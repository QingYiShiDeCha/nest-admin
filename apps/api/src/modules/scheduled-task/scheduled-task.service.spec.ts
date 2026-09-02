import { BadRequestException } from '@nestjs/common';

import {
  serializeTaskResult,
  validateSchedule,
} from './scheduled-task.service';

describe('定时任务配置', () => {
  it('接受合法 Cron 表达式和 IANA 时区', () => {
    expect(() => validateSchedule('0 3 * * *', 'Asia/Shanghai')).not.toThrow();
    expect(() => validateSchedule('*/10 * * * * *', 'UTC')).not.toThrow();
  });

  it('拒绝非法 Cron 表达式或时区', () => {
    expect(() => validateSchedule('not-a-cron', 'Asia/Shanghai')).toThrow(
      BadRequestException,
    );
    expect(() => validateSchedule('0 3 * * *', 'Mars/Base')).toThrow(
      BadRequestException,
    );
  });

  it('序列化并截断任务返回值', () => {
    expect(serializeTaskResult({ deleted: 3 })).toBe('{"deleted":3}');
    expect(serializeTaskResult(undefined)).toBeNull();
    expect(serializeTaskResult('x'.repeat(10_100))).toHaveLength(10_003);
  });
});
