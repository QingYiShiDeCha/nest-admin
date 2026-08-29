<script setup lang="ts">
import type { ThemeConfig } from 'antdv-next';
import { theme as antdvTheme } from 'antdv-next';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, watchEffect } from 'vue';
import { RouterView } from 'vue-router';
import zh_CN from 'antdv-next/locale/zh_CN';

import {
  DARK_GRAY_COLORS,
  DARK_THEME_COLORS,
  GRAY_COLORS,
  LIGHT_THEME_COLORS,
  SEMANTIC_COLORS,
} from './constants/palette';
import { useSettingsStore } from './stores/settings';

const settings = useSettingsStore();
const { primaryColor, resolvedTheme } = storeToRefs(settings);
const CSS_VAR_KEY = 'css-var-nest-admin';

/**
 * 全局 design token：主色来自顶栏切换器（选择持久化），语义色取自
 * palette 单一来源。梯度与 hover 态由 antdv 的派生算法生成，
 * 这里只声明种子。
 */
const themeConfig = computed<ThemeConfig>(() => ({
  algorithm:
    resolvedTheme.value === 'dark'
      ? antdvTheme.darkAlgorithm
      : antdvTheme.defaultAlgorithm,
  cssVar: { key: CSS_VAR_KEY },
  token: {
    colorPrimary: primaryColor.value,
    colorLink: primaryColor.value,
    colorSuccess: SEMANTIC_COLORS.success,
    colorWarning: SEMANTIC_COLORS.warning,
    colorError: SEMANTIC_COLORS.danger,
    colorInfo: SEMANTIC_COLORS.info,
    fontSize: 15,
    controlHeight: 34,
    ...(resolvedTheme.value === 'light'
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
          colorText: GRAY_COLORS[900],
          colorTextHeading: GRAY_COLORS[900],
          colorTextSecondary: GRAY_COLORS[700],
          colorTextLabel: GRAY_COLORS[700],
          colorTextTertiary: GRAY_COLORS[600],
          colorTextDescription: GRAY_COLORS[600],
          colorTextQuaternary: GRAY_COLORS[500],
          colorTextPlaceholder: GRAY_COLORS[500],
          colorTextDisabled: GRAY_COLORS[500],
          colorIcon: GRAY_COLORS[600],
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
          controlItemBgActiveHover: DARK_THEME_COLORS.background.elementActive,
        }),
  },
  components: {
    Tag: {
      defaultBg:
        resolvedTheme.value === 'light'
          ? LIGHT_THEME_COLORS.background.level1
          : DARK_THEME_COLORS.background.level2,
      defaultColor:
        resolvedTheme.value === 'light'
          ? GRAY_COLORS[700]
          : DARK_GRAY_COLORS[800],
    },
    Menu: {
      itemHeight: 44,
      iconSize: 18,
      collapsedIconSize: 20,
      ...(resolvedTheme.value === 'light'
        ? {
            itemBg: LIGHT_THEME_COLORS.menu.background,
            subMenuItemBg: LIGHT_THEME_COLORS.menu.background,
            itemColor: LIGHT_THEME_COLORS.menu.text,
            itemHoverColor: LIGHT_THEME_COLORS.menu.text,
            itemHoverBg: LIGHT_THEME_COLORS.background.hover,
            itemActiveBg: LIGHT_THEME_COLORS.background.active,
            itemSelectedBg: LIGHT_THEME_COLORS.background.active,
            itemSelectedColor: primaryColor.value,
            subMenuItemSelectedColor: primaryColor.value,
          }
        : {
            itemBg: DARK_THEME_COLORS.menu.background,
            subMenuItemBg: DARK_THEME_COLORS.menu.background,
            itemColor: DARK_THEME_COLORS.menu.text,
            itemHoverColor: DARK_GRAY_COLORS[900],
            itemHoverBg: DARK_THEME_COLORS.background.hover,
            itemActiveBg: DARK_THEME_COLORS.background.active,
            itemSelectedBg: DARK_THEME_COLORS.background.elementActive,
            itemSelectedColor: primaryColor.value,
            subMenuItemSelectedColor: primaryColor.value,
          }),
      darkPopupBg: DARK_THEME_COLORS.traditionalMenu.background,
      darkItemBg: DARK_THEME_COLORS.traditionalMenu.background,
      darkSubMenuItemBg: DARK_THEME_COLORS.traditionalMenu.background,
      darkItemColor: DARK_THEME_COLORS.traditionalMenu.text,
      darkItemHoverColor: DARK_GRAY_COLORS[900],
      darkItemHoverBg: DARK_THEME_COLORS.background.hover,
      darkItemSelectedBg: DARK_THEME_COLORS.background.elementActive,
      darkItemSelectedColor: primaryColor.value,
      darkGroupTitleColor: DARK_THEME_COLORS.traditionalMenu.text,
    },
  },
}));

watchEffect(() => {
  document.documentElement.dataset.theme = resolvedTheme.value;
  document.documentElement.style.colorScheme = resolvedTheme.value;
});

onMounted(() => document.documentElement.classList.add(CSS_VAR_KEY));
onBeforeUnmount(() => document.documentElement.classList.remove(CSS_VAR_KEY));
</script>

<template>
  <a-config-provider :theme="themeConfig" :locale="zh_CN">
    <div :class="CSS_VAR_KEY" class="h-full a-bg-layout a-color-text">
      <RouterView />
    </div>
  </a-config-provider>
</template>
