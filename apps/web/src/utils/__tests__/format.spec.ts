import { describe, expect, it } from 'vitest';

import { formatFileSize } from '@/utils/format';

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
