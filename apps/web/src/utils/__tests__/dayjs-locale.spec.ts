import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { configureDayjsLocale } from '../dayjs-locale';

describe('configureDayjsLocale', () => {
  it('将 dayjs 全局语言设置为中文', () => {
    dayjs.locale('en');

    configureDayjsLocale();

    expect(dayjs.locale()).toBe('zh-cn');
  });
});
