<script setup lang="ts">
import { Tag, theme as antdvTheme } from 'antdv-next';
import { computed } from 'vue';
import type { CSSProperties } from 'vue';

import type { ThemeTone } from '@/constants/palette';

defineOptions({ name: 'AppTag', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    tone?: ThemeTone;
  }>(),
  { tone: 'default' },
);

const { token } = antdvTheme.useToken();

const tagStyle = computed<CSSProperties>(() => {
  switch (props.tone) {
    case 'primary':
      return {
        color: token.value.colorPrimary,
        backgroundColor: token.value.colorPrimaryBg,
        borderColor: token.value.colorPrimaryBorder,
      };
    case 'success':
      return {
        color: token.value.colorSuccess,
        backgroundColor: token.value.colorSuccessBg,
        borderColor: token.value.colorSuccessBorder,
      };
    case 'warning':
      return {
        color: token.value.colorWarning,
        backgroundColor: token.value.colorWarningBg,
        borderColor: token.value.colorWarningBorder,
      };
    case 'error':
      return {
        color: token.value.colorError,
        backgroundColor: token.value.colorErrorBg,
        borderColor: token.value.colorErrorBorder,
      };
    case 'info':
      return {
        color: token.value.colorInfo,
        backgroundColor: token.value.colorInfoBg,
        borderColor: token.value.colorInfoBorder,
      };
    default:
      return {
        color: token.value.colorTextSecondary,
        backgroundColor: token.value.colorFillTertiary,
        borderColor: token.value.colorBorderSecondary,
      };
  }
});
</script>

<template>
  <Tag v-bind="$attrs" :style="tagStyle"><slot /></Tag>
</template>
