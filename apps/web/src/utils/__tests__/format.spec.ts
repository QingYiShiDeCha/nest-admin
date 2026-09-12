import { describe, expect, it } from 'vitest';

import { formatDateTime, formatFileSize } from '@/utils/format';

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [10 * 1024 * 1024, '10 MB'],
  ])('将 %d 字节格式化为 %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe('formatDateTime（墙钟时间显示）', () => {
  it.each([
    ['2026-09-12T09:54:28.000Z'],
    ['2026-09-12T09:54:28+08:00'],
    ['2026-09-12 09:54:28'],
  ])('API 墙钟时间原样显示，不做时区换算：%s', (value) => {
    expect(formatDateTime(value)).toBe('2026-09-12 09:54:28');
  });

  it('空值显示占位符', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
  });
});
