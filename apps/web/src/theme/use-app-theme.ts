import type { ConfigProviderProps, ThemeConfig } from 'antdv-next';
import { theme as antdvTheme } from 'antdv-next';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, watchEffect } from 'vue';
import zh_CN from 'antdv-next/locale/zh_CN';

import {
  DARK_GRAY_COLORS,
  DARK_THEME_COLORS,
  GRAY_COLORS,
  LIGHT_THEME_COLORS,
  mixColor,
  SEMANTIC_COLORS,
  STATUS_SURFACE_COLORS,
} from '@/constants/palette';
import type { ResolvedTheme } from '@/stores/settings';
import { useSettingsStore } from '@/stores/settings';

const CSS_VAR_KEY = 'css-var-nest-admin';

function createComponentTokens(
  primaryColor: string,
  resolvedTheme: ResolvedTheme,
  borderRadius: number,
): NonNullable<ThemeConfig['components']> {
  const isLight = resolvedTheme === 'light';
  const background = isLight
    ? LIGHT_THEME_COLORS.background
    : DARK_THEME_COLORS.background;
  const border = isLight ? LIGHT_THEME_COLORS.border : DARK_THEME_COLORS.border;
  const text = {
    default: isLight
      ? LIGHT_THEME_COLORS.foreground.default
      : DARK_GRAY_COLORS[900],
    heading: isLight ? GRAY_COLORS[900] : DARK_GRAY_COLORS[900],
    secondary: isLight ? GRAY_COLORS[700] : DARK_GRAY_COLORS[700],
  };
  const statusSurface = isLight
    ? STATUS_SURFACE_COLORS.light
    : STATUS_SURFACE_COLORS.dark;
  const focusShadow = `0 0 0 2px ${mixColor(primaryColor, 18, 'transparent')}`;

  return {
    Button: {
      fontWeight: 500,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      defaultColor: text.default,
      defaultBg: background.container,
      defaultBorderColor: border.default,
      defaultHoverBg: background.hover,
      defaultHoverColor: primaryColor,
      defaultHoverBorderColor: primaryColor,
      defaultActiveBg: background.active,
      defaultActiveColor: primaryColor,
      defaultActiveBorderColor: primaryColor,
      borderRadius,
    },
    Input: {
      addonBg: background.level1,
      hoverBg: background.container,
      activeBg: background.container,
      hoverBorderColor: primaryColor,
      activeBorderColor: primaryColor,
      activeShadow: focusShadow,
      errorActiveShadow: `0 0 0 2px ${mixColor(
        SEMANTIC_COLORS.danger,
        18,
        'transparent',
      )}`,
      warningActiveShadow: `0 0 0 2px ${mixColor(
        SEMANTIC_COLORS.warning,
        18,
        'transparent',
      )}`,
      borderRadius,
    },
    Select: {
      selectorBg: background.container,
      clearBg: background.container,
      multipleItemBg: background.level2,
      multipleItemBorderColor: border.default,
      optionSelectedColor: primaryColor,
      optionSelectedFontWeight: 500,
      optionSelectedBg: background.active,
      optionActiveBg: background.hover,
      hoverBorderColor: primaryColor,
      activeBorderColor: primaryColor,
      activeOutlineColor: mixColor(primaryColor, 18, 'transparent'),
      borderRadius,
    },
    Modal: {
      headerBg: background.container,
      contentBg: background.container,
      footerBg: background.container,
      titleColor: text.heading,
      titleFontSize: 16,
      headerBorderBottom: 'none',
      footerBorderTop: 'none',
      borderRadiusLG: borderRadius + 2,
    },
    Notification: {
      progressBg: primaryColor,
      colorSuccessBg: statusSurface.success,
      colorWarningBg: statusSurface.warning,
      colorErrorBg: statusSurface.error,
      colorInfoBg: statusSurface.info,
      colorBgElevated: background.container,
      colorText: text.default,
      borderRadiusLG: borderRadius + 2,
    },
    Message: {
      contentBg: background.container,
    },
    Tag: {
      defaultBg: isLight ? background.level1 : background.level2,
      defaultColor: isLight ? GRAY_COLORS[700] : DARK_GRAY_COLORS[800],
    },
    Card: {
      headerBg: background.container,
      actionsBg: background.container,
      extraColor: text.secondary,
      colorBgContainer: background.container,
      colorBorderSecondary: border.card,
      borderRadiusLG: borderRadius + 2,
    },
    Table: {
      headerBg: background.level1,
      headerColor: text.heading,
      headerSortActiveBg: background.level2,
      headerSortHoverBg: background.hover,
      bodySortBg: background.level1,
      rowHoverBg: background.hover,
      rowSelectedBg: background.active,
      rowSelectedHoverBg: background.hover,
      rowExpandedBg: background.level1,
      borderColor: border.default,
      headerSplitColor: border.default,
      footerBg: background.level1,
      footerColor: text.secondary,
      expandIconBg: background.container,
    },
    Form: {
      labelColor: text.secondary,
      labelRequiredMarkColor: SEMANTIC_COLORS.danger,
    },
    Pagination: {
      itemBg: background.container,
      itemLinkBg: background.container,
      itemInputBg: background.container,
      itemActiveBg: background.active,
      itemActiveColor: primaryColor,
      itemActiveColorHover: primaryColor,
    },
    Drawer: {
      colorBgElevated: background.container,
      colorBorderSecondary: border.card,
    },
    Menu: {
      itemHeight: 44,
      iconSize: 18,
      collapsedIconSize: 20,
      ...(isLight
        ? {
            itemBg: LIGHT_THEME_COLORS.menu.background,
            subMenuItemBg: LIGHT_THEME_COLORS.menu.background,
            itemColor: LIGHT_THEME_COLORS.menu.text,
            itemHoverColor: LIGHT_THEME_COLORS.menu.text,
            itemHoverBg: LIGHT_THEME_COLORS.background.hover,
            itemActiveBg: LIGHT_THEME_COLORS.background.active,
            itemSelectedBg: LIGHT_THEME_COLORS.background.active,
            itemSelectedColor: primaryColor,
            subMenuItemSelectedColor: primaryColor,
          }
        : {
            itemBg: DARK_THEME_COLORS.menu.background,
            subMenuItemBg: DARK_THEME_COLORS.menu.background,
            itemColor: DARK_THEME_COLORS.menu.text,
            itemHoverColor: DARK_GRAY_COLORS[900],
            itemHoverBg: DARK_THEME_COLORS.background.hover,
            itemActiveBg: DARK_THEME_COLORS.background.active,
            itemSelectedBg: DARK_THEME_COLORS.background.elementActive,
            itemSelectedColor: primaryColor,
            subMenuItemSelectedColor: primaryColor,
          }),
      darkPopupBg: DARK_THEME_COLORS.traditionalMenu.background,
      darkItemBg: DARK_THEME_COLORS.traditionalMenu.background,
      darkSubMenuItemBg: DARK_THEME_COLORS.traditionalMenu.background,
      darkItemColor: DARK_THEME_COLORS.traditionalMenu.text,
      darkItemHoverColor: DARK_GRAY_COLORS[900],
      darkItemHoverBg: DARK_THEME_COLORS.background.hover,
      darkItemSelectedBg: DARK_THEME_COLORS.background.elementActive,
      darkItemSelectedColor: primaryColor,
      darkGroupTitleColor: DARK_THEME_COLORS.traditionalMenu.text,
    },
  };
}

function createThemeConfig(
  primaryColor: string,
  resolvedTheme: ResolvedTheme,
  borderRadius: number,
): ThemeConfig {
  return {
    algorithm:
      resolvedTheme === 'dark'
        ? antdvTheme.darkAlgorithm
        : antdvTheme.defaultAlgorithm,
    cssVar: { key: CSS_VAR_KEY },
    token: {
      colorPrimary: primaryColor,
      colorLink: primaryColor,
      colorSuccess: SEMANTIC_COLORS.success,
      colorWarning: SEMANTIC_COLORS.warning,
      colorError: SEMANTIC_COLORS.danger,
      colorInfo: SEMANTIC_COLORS.info,
      fontSize: 15,
      controlHeight: 34,
      borderRadius,
      borderRadiusLG: borderRadius + 2,
      borderRadiusSM: Math.max(borderRadius - 2, 0),
      borderRadiusXS: Math.max(borderRadius - 4, 0),
      ...(resolvedTheme === 'light'
        ? {
            colorBgLayout: LIGHT_THEME_COLORS.background.layout,
            colorBgContainer: LIGHT_THEME_COLORS.background.container,
            colorBgElevated: LIGHT_THEME_COLORS.background.container,
            colorBgContainerDisabled: LIGHT_THEME_COLORS.background.level1,
            colorFill: GRAY_COLORS[300],
            colorFillSecondary: LIGHT_THEME_COLORS.background.hover,
            colorFillTertiary: LIGHT_THEME_COLORS.background.level2,
            colorFillQuaternary: LIGHT_THEME_COLORS.background.level1,
            colorFillAlter: LIGHT_THEME_COLORS.background.level1,
            colorFillContent: LIGHT_THEME_COLORS.background.level2,
            colorFillContentHover: LIGHT_THEME_COLORS.background.hover,
            colorBgTextHover: LIGHT_THEME_COLORS.background.hover,
            colorBgTextActive: LIGHT_THEME_COLORS.background.active,
            colorText: LIGHT_THEME_COLORS.foreground.default,
            colorTextHeading: GRAY_COLORS[900],
            colorTextSecondary: GRAY_COLORS[700],
            colorTextLabel: GRAY_COLORS[700],
            colorTextTertiary: GRAY_COLORS[600],
            colorTextDescription: GRAY_COLORS[600],
            colorTextQuaternary: GRAY_COLORS[500],
            colorTextPlaceholder: GRAY_COLORS[500],
            colorTextDisabled: GRAY_COLORS[500],
            colorIcon: LIGHT_THEME_COLORS.foreground.default,
            colorIconHover: GRAY_COLORS[700],
            colorBorder: LIGHT_THEME_COLORS.border.default,
            colorBorderSecondary: LIGHT_THEME_COLORS.border.card,
            colorSplit: LIGHT_THEME_COLORS.border.previewDivider,
            controlItemBgHover: LIGHT_THEME_COLORS.background.hover,
            controlItemBgActive: LIGHT_THEME_COLORS.background.active,
            controlItemBgActiveHover: LIGHT_THEME_COLORS.background.hover,
          }
        : {
            colorBgBase: DARK_THEME_COLORS.background.base,
            colorBgLayout: DARK_THEME_COLORS.background.layout,
            colorBgContainer: DARK_THEME_COLORS.background.container,
            colorBgElevated: DARK_THEME_COLORS.background.container,
            colorBgContainerDisabled: DARK_THEME_COLORS.background.level1,
            colorFill: DARK_GRAY_COLORS[300],
            colorFillSecondary: DARK_THEME_COLORS.background.hover,
            colorFillTertiary: DARK_THEME_COLORS.background.level2,
            colorFillQuaternary: DARK_THEME_COLORS.background.level1,
            colorFillAlter: DARK_THEME_COLORS.background.level1,
            colorFillContent: DARK_THEME_COLORS.background.level2,
            colorFillContentHover: DARK_THEME_COLORS.background.hover,
            colorBgTextHover: DARK_THEME_COLORS.background.hover,
            colorBgTextActive: DARK_THEME_COLORS.background.active,
            colorText: DARK_GRAY_COLORS[900],
            colorTextHeading: DARK_GRAY_COLORS[900],
            colorTextSecondary: DARK_GRAY_COLORS[700],
            colorTextLabel: DARK_GRAY_COLORS[700],
            colorTextTertiary: DARK_GRAY_COLORS[600],
            colorTextDescription: DARK_GRAY_COLORS[600],
            colorTextQuaternary: DARK_GRAY_COLORS[500],
            colorTextPlaceholder: DARK_GRAY_COLORS[500],
            colorTextDisabled: DARK_GRAY_COLORS[500],
            colorIcon: DARK_GRAY_COLORS[600],
            colorIconHover: DARK_GRAY_COLORS[700],
            colorBorder: DARK_THEME_COLORS.border.default,
            colorBorderSecondary: DARK_THEME_COLORS.border.card,
            colorSplit: DARK_THEME_COLORS.border.card,
            controlItemBgHover: DARK_THEME_COLORS.background.hover,
            controlItemBgActive: DARK_THEME_COLORS.background.elementActive,
            controlItemBgActiveHover:
              DARK_THEME_COLORS.background.elementActive,
          }),
    },
    components: createComponentTokens(
      primaryColor,
      resolvedTheme,
      borderRadius,
    ),
  };
}

export function useAppTheme() {
  const settings = useSettingsStore();
  const { borderRadius, primaryColor, resolvedTheme } = storeToRefs(settings);

  const configProps = computed<ConfigProviderProps>(() => ({
    locale: zh_CN,
    theme: createThemeConfig(
      primaryColor.value,
      resolvedTheme.value,
      borderRadius.value,
    ),
    notification: {
      classes: {
        root: 'border border-solid a-border-border',
      },
    },
  }));

  watchEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme.value;
    document.documentElement.style.colorScheme = resolvedTheme.value;
  });

  onMounted(() => document.documentElement.classList.add(CSS_VAR_KEY));
  onBeforeUnmount(() => document.documentElement.classList.remove(CSS_VAR_KEY));

  return configProps;
}
