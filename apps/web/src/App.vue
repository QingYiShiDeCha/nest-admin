<script setup lang="ts">
import type { ThemeConfig } from 'antdv-next';
import { computed } from 'vue';
import { RouterView } from 'vue-router';

import { SEMANTIC_COLORS } from './constants/palette';
import { useSettingsStore } from './stores/settings';

const settings = useSettingsStore();

/**
 * 全局 design token：主色来自顶栏切换器（选择持久化），语义色取自
 * palette 单一来源。梯度与 hover 态由 antdv 的派生算法生成，
 * 这里只声明种子。
 */
const themeConfig = computed<ThemeConfig>(() => ({
  token: {
    colorPrimary: settings.primaryColor,
    colorSuccess: SEMANTIC_COLORS.success,
    colorWarning: SEMANTIC_COLORS.warning,
    colorError: SEMANTIC_COLORS.danger,
    colorInfo: SEMANTIC_COLORS.info,
  },
}));
</script>

<template>
  <a-config-provider :theme="themeConfig">
    <RouterView />
  </a-config-provider>
</template>
