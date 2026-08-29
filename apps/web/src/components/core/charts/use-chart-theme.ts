import { theme as antdvTheme } from 'antdv-next';
import { computed } from 'vue';

import { SEMANTIC_COLORS } from '@/constants/palette';
import { useSettingsStore } from '@/stores/settings';

import type { ChartTheme } from './types';

export function useChartTheme() {
  const settings = useSettingsStore();
  const { token } = antdvTheme.useToken();

  return computed<ChartTheme>(() => ({
    primaryColor: settings.primaryColor,
    colors: [
      settings.primaryColor,
      SEMANTIC_COLORS.success,
      SEMANTIC_COLORS.warning,
      SEMANTIC_COLORS.info,
      SEMANTIC_COLORS.error,
      SEMANTIC_COLORS.danger,
    ],
    textColor: token.value.colorText,
    secondaryTextColor: token.value.colorTextSecondary,
    borderColor: token.value.colorBorderSecondary,
    containerColor: token.value.colorBgContainer,
    elevatedColor: token.value.colorBgElevated,
    fillColor: token.value.colorFillSecondary,
    successColor: SEMANTIC_COLORS.success,
  }));
}
