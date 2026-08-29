import { BRAND_COLORS, DEFAULT_PRIMARY, SEMANTIC_COLORS } from '@/constants/palette';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from '@/stores/settings';

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('默认主色是调色板里的默认蓝', () => {
    const settings = useSettingsStore();

    expect(settings.primaryColor).toBe(DEFAULT_PRIMARY);
    expect(settings.primaryColor).toBe('#5D87FF');
  });

  it('setPrimaryColor 切换主色，供 App.vue 的 ConfigProvider 消费', () => {
    const settings = useSettingsStore();
    const purple = BRAND_COLORS[1]!.value;

    settings.setPrimaryColor(purple);

    expect(settings.primaryColor).toBe('#B48DF3');
  });

  it('语义色是调色板约定的值（ConfigProvider 注入时消费）', () => {
    expect(SEMANTIC_COLORS.success).toBe('#13DEB9');
    expect(SEMANTIC_COLORS.warning).toBe('#FFAE1F');
    expect(SEMANTIC_COLORS.danger).toBe('#FF4D4F');
    expect(SEMANTIC_COLORS.error).toBe('#FA896B');
    expect(SEMANTIC_COLORS.info).toBe('#38C0FC');
  });
});
