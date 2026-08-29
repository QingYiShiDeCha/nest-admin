import { BRAND_COLORS, DEFAULT_PRIMARY, SEMANTIC_COLORS } from '@/constants/palette';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettingsStore } from '@/stores/settings';

function mockSystemTheme(initialDark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(
      (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
    ),
    removeEventListener: vi.fn(
      (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
    ),
  } as unknown as MediaQueryList;

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

  return {
    setDark(value: boolean) {
      Object.defineProperty(mediaQuery, 'matches', { configurable: true, value });
      listeners.forEach((listener) =>
        listener({ matches: value } as MediaQueryListEvent),
      );
    },
  };
}

describe('settings store', () => {
  beforeEach(() => {
    mockSystemTheme(false);
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('默认使用浅色主题，并可切换为深色主题', () => {
    const settings = useSettingsStore();

    expect(settings.themeMode).toBe('light');
    expect(settings.resolvedTheme).toBe('light');

    settings.setThemeMode('dark');

    expect(settings.themeMode).toBe('dark');
    expect(settings.resolvedTheme).toBe('dark');
  });

  it('菜单背景默认浅色，并可独立切换为深色', () => {
    const settings = useSettingsStore();

    expect(settings.menuBackground).toBe('light');

    settings.setMenuBackground('dark');

    expect(settings.menuBackground).toBe('dark');
    expect(settings.themeMode).toBe('light');
  });

  it('跟随系统主题，并实时响应系统配色变化', () => {
    const systemTheme = mockSystemTheme(false);
    const settings = useSettingsStore();

    settings.setThemeMode('system');
    expect(settings.resolvedTheme).toBe('light');

    systemTheme.setDark(true);

    expect(settings.themeMode).toBe('system');
    expect(settings.resolvedTheme).toBe('dark');
  });

  it('语义色是调色板约定的值（ConfigProvider 注入时消费）', () => {
    expect(SEMANTIC_COLORS.success).toBe('#13DEB9');
    expect(SEMANTIC_COLORS.warning).toBe('#FFAE1F');
    expect(SEMANTIC_COLORS.danger).toBe('#FF4D4F');
    expect(SEMANTIC_COLORS.error).toBe('#FA896B');
    expect(SEMANTIC_COLORS.info).toBe('#38C0FC');
  });
});
