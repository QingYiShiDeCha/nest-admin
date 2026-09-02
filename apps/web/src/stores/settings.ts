import { DEFAULT_PRIMARY } from '@/constants/palette';
import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;
export type MenuBackground = 'light' | 'dark';
export type TabStyle = 'card' | 'line' | 'pill';
export type PageTransition = 'none' | 'fade' | 'slide-left' | 'slide-up';
export type ContainerWidth = 'full' | 'fixed';
export type BooleanLayoutSetting =
  | 'showTabs'
  | 'sidebarAccordion'
  | 'showSidebarCollapseButton'
  | 'showQuickEntry'
  | 'showRefreshButton'
  | 'showBreadcrumb'
  | 'showTopProgress'
  | 'showWatermark'
  | 'mobileTableCardMode'
  | 'showCopyright';

export interface SettingsSnapshot {
  primaryColor: string;
  themeMode: ThemeMode;
  menuBackground: MenuBackground;
  showTabs: boolean;
  sidebarAccordion: boolean;
  showSidebarCollapseButton: boolean;
  showQuickEntry: boolean;
  showRefreshButton: boolean;
  showBreadcrumb: boolean;
  showTopProgress: boolean;
  showWatermark: boolean;
  mobileTableCardMode: boolean;
  showCopyright: boolean;
  menuWidth: number;
  tabStyle: TabStyle;
  pageTransition: PageTransition;
  borderRadius: number;
  containerWidth: ContainerWidth;
}

export const MENU_WIDTH_MIN = 180;
export const MENU_WIDTH_MAX = 280;
export const BORDER_RADIUS_MIN = 0;
export const BORDER_RADIUS_MAX = 16;

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';
const DEFAULT_SETTINGS: SettingsSnapshot = {
  primaryColor: DEFAULT_PRIMARY,
  themeMode: 'light',
  menuBackground: 'light',
  showTabs: true,
  sidebarAccordion: false,
  showSidebarCollapseButton: true,
  showQuickEntry: false,
  showRefreshButton: true,
  showBreadcrumb: true,
  showTopProgress: true,
  showWatermark: false,
  mobileTableCardMode: true,
  showCopyright: false,
  menuWidth: 220,
  tabStyle: 'card',
  pageTransition: 'slide-up',
  borderRadius: 6,
  containerWidth: 'full',
};

/**
 * 界面偏好设置。主题模式和主色经 App.vue 的 ConfigProvider 注入，
 * 切换即时生效并持久化；system 模式会实时响应系统配色变化。
 */
export const useSettingsStore = defineStore(
  'settings',
  () => {
    const primaryColor = ref<string>(DEFAULT_SETTINGS.primaryColor);
    const themeMode = ref<ThemeMode>(DEFAULT_SETTINGS.themeMode);
    const menuBackground = ref<MenuBackground>(DEFAULT_SETTINGS.menuBackground);
    const showTabs = ref(DEFAULT_SETTINGS.showTabs);
    const sidebarAccordion = ref(DEFAULT_SETTINGS.sidebarAccordion);
    const showSidebarCollapseButton = ref(
      DEFAULT_SETTINGS.showSidebarCollapseButton,
    );
    const showQuickEntry = ref(DEFAULT_SETTINGS.showQuickEntry);
    const showRefreshButton = ref(DEFAULT_SETTINGS.showRefreshButton);
    const showBreadcrumb = ref(DEFAULT_SETTINGS.showBreadcrumb);
    const showTopProgress = ref(DEFAULT_SETTINGS.showTopProgress);
    const showWatermark = ref(DEFAULT_SETTINGS.showWatermark);
    const mobileTableCardMode = ref(DEFAULT_SETTINGS.mobileTableCardMode);
    const showCopyright = ref(DEFAULT_SETTINGS.showCopyright);
    const menuWidth = ref(DEFAULT_SETTINGS.menuWidth);
    const tabStyle = ref<TabStyle>(DEFAULT_SETTINGS.tabStyle);
    const pageTransition = ref<PageTransition>(DEFAULT_SETTINGS.pageTransition);
    const borderRadius = ref(DEFAULT_SETTINGS.borderRadius);
    const containerWidth = ref<ContainerWidth>(DEFAULT_SETTINGS.containerWidth);
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
    onScopeDispose(() =>
      mediaQuery?.removeEventListener('change', syncSystemTheme),
    );

    function setPrimaryColor(value: string): void {
      primaryColor.value = value;
    }

    function setThemeMode(value: ThemeMode): void {
      themeMode.value = value;
    }

    function setMenuBackground(value: MenuBackground): void {
      menuBackground.value = value;
    }

    const booleanLayoutSettings = {
      showTabs,
      sidebarAccordion,
      showSidebarCollapseButton,
      showQuickEntry,
      showRefreshButton,
      showBreadcrumb,
      showTopProgress,
      showWatermark,
      mobileTableCardMode,
      showCopyright,
    };

    function setBooleanLayoutSetting(
      key: BooleanLayoutSetting,
      value: boolean,
    ): void {
      booleanLayoutSettings[key].value = value;
    }

    function setMenuWidth(value: number): void {
      menuWidth.value = Math.min(
        MENU_WIDTH_MAX,
        Math.max(MENU_WIDTH_MIN, Math.round(value / 10) * 10),
      );
    }

    function setTabStyle(value: TabStyle): void {
      tabStyle.value = value;
    }

    function setPageTransition(value: PageTransition): void {
      pageTransition.value = value;
    }

    function setBorderRadius(value: number): void {
      borderRadius.value = Math.min(
        BORDER_RADIUS_MAX,
        Math.max(BORDER_RADIUS_MIN, Math.round(value)),
      );
    }

    function setContainerWidth(value: ContainerWidth): void {
      containerWidth.value = value;
    }

    function getSettingsSnapshot(): SettingsSnapshot {
      return {
        primaryColor: primaryColor.value,
        themeMode: themeMode.value,
        menuBackground: menuBackground.value,
        showTabs: showTabs.value,
        sidebarAccordion: sidebarAccordion.value,
        showSidebarCollapseButton: showSidebarCollapseButton.value,
        showQuickEntry: showQuickEntry.value,
        showRefreshButton: showRefreshButton.value,
        showBreadcrumb: showBreadcrumb.value,
        showTopProgress: showTopProgress.value,
        showWatermark: showWatermark.value,
        mobileTableCardMode: mobileTableCardMode.value,
        showCopyright: showCopyright.value,
        menuWidth: menuWidth.value,
        tabStyle: tabStyle.value,
        pageTransition: pageTransition.value,
        borderRadius: borderRadius.value,
        containerWidth: containerWidth.value,
      };
    }

    function resetSettings(): void {
      primaryColor.value = DEFAULT_SETTINGS.primaryColor;
      themeMode.value = DEFAULT_SETTINGS.themeMode;
      menuBackground.value = DEFAULT_SETTINGS.menuBackground;
      showTabs.value = DEFAULT_SETTINGS.showTabs;
      sidebarAccordion.value = DEFAULT_SETTINGS.sidebarAccordion;
      showSidebarCollapseButton.value =
        DEFAULT_SETTINGS.showSidebarCollapseButton;
      showQuickEntry.value = DEFAULT_SETTINGS.showQuickEntry;
      showRefreshButton.value = DEFAULT_SETTINGS.showRefreshButton;
      showBreadcrumb.value = DEFAULT_SETTINGS.showBreadcrumb;
      showTopProgress.value = DEFAULT_SETTINGS.showTopProgress;
      showWatermark.value = DEFAULT_SETTINGS.showWatermark;
      mobileTableCardMode.value = DEFAULT_SETTINGS.mobileTableCardMode;
      showCopyright.value = DEFAULT_SETTINGS.showCopyright;
      menuWidth.value = DEFAULT_SETTINGS.menuWidth;
      tabStyle.value = DEFAULT_SETTINGS.tabStyle;
      pageTransition.value = DEFAULT_SETTINGS.pageTransition;
      borderRadius.value = DEFAULT_SETTINGS.borderRadius;
      containerWidth.value = DEFAULT_SETTINGS.containerWidth;
    }

    return {
      primaryColor,
      themeMode,
      resolvedTheme,
      menuBackground,
      showTabs,
      sidebarAccordion,
      showSidebarCollapseButton,
      showQuickEntry,
      showRefreshButton,
      showBreadcrumb,
      showTopProgress,
      showWatermark,
      mobileTableCardMode,
      showCopyright,
      menuWidth,
      tabStyle,
      pageTransition,
      borderRadius,
      containerWidth,
      setPrimaryColor,
      setThemeMode,
      setMenuBackground,
      setBooleanLayoutSetting,
      setMenuWidth,
      setTabStyle,
      setPageTransition,
      setBorderRadius,
      setContainerWidth,
      getSettingsSnapshot,
      resetSettings,
    };
  },
  {
    // 主色存具体色值而不是索引：调色板调整顺序时不影响已有选择
    persist: {
      pick: [
        'primaryColor',
        'themeMode',
        'menuBackground',
        'showTabs',
        'sidebarAccordion',
        'showSidebarCollapseButton',
        'showQuickEntry',
        'showRefreshButton',
        'showBreadcrumb',
        'showTopProgress',
        'showWatermark',
        'mobileTableCardMode',
        'showCopyright',
        'menuWidth',
        'tabStyle',
        'pageTransition',
        'borderRadius',
        'containerWidth',
      ],
    },
  },
);
