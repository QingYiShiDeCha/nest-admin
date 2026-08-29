import { DEFAULT_PRIMARY } from '@/constants/palette';
import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;
export type MenuBackground = 'light' | 'dark';

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

/**
 * 界面偏好设置。主题模式和主色经 App.vue 的 ConfigProvider 注入，
 * 切换即时生效并持久化；system 模式会实时响应系统配色变化。
 */
export const useSettingsStore = defineStore(
  'settings',
  () => {
    const primaryColor = ref<string>(DEFAULT_PRIMARY);
    const themeMode = ref<ThemeMode>('light');
    const menuBackground = ref<MenuBackground>('light');
    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(DARK_MODE_QUERY)
        : null;
    const systemDark = ref(mediaQuery?.matches ?? false);

    const resolvedTheme = computed<ResolvedTheme>(() =>
      themeMode.value === 'system'
        ? systemDark.value
          ? 'dark'
          : 'light'
        : themeMode.value,
    );

    function syncSystemTheme(event: MediaQueryListEvent): void {
      systemDark.value = event.matches;
    }

    mediaQuery?.addEventListener('change', syncSystemTheme);
    onScopeDispose(() => mediaQuery?.removeEventListener('change', syncSystemTheme));

    function setPrimaryColor(value: string): void {
      primaryColor.value = value;
    }

    function setThemeMode(value: ThemeMode): void {
      themeMode.value = value;
    }

    function setMenuBackground(value: MenuBackground): void {
      menuBackground.value = value;
    }

    return {
      primaryColor,
      themeMode,
      resolvedTheme,
      menuBackground,
      setPrimaryColor,
      setThemeMode,
      setMenuBackground,
    };
  },
  {
    // 主色存具体色值而不是索引：调色板调整顺序时不影响已有选择
    persist: { pick: ['primaryColor', 'themeMode', 'menuBackground'] },
  },
);
