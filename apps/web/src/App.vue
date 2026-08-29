<script setup lang="ts">
import type { ThemeConfig } from 'antdv-next';
import { theme as antdvTheme } from 'antdv-next';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, watchEffect } from 'vue';
import { RouterView } from 'vue-router';
import zh_CN from 'antdv-next/locale/zh_CN';

import { SEMANTIC_COLORS } from './constants/palette';
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
    colorSuccess: SEMANTIC_COLORS.success,
    colorWarning: SEMANTIC_COLORS.warning,
    colorError: SEMANTIC_COLORS.danger,
    colorInfo: SEMANTIC_COLORS.info,
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
