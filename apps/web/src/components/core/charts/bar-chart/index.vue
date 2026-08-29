<script setup lang="ts">
import { computed } from 'vue';

import BaseChart from '../base-chart/index.vue';
import { buildBarChartOption, hasCartesianData } from '../options';
import type { BarChartProps } from '../types';
import { useChartTheme } from '../use-chart-theme';

defineOptions({ name: 'BarChart', inheritAttrs: false });

const props = withDefaults(defineProps<BarChartProps>(), {
  animation: true,
  loading: false,
  direction: 'vertical',
  barMaxWidth: 28,
  emptyText: '暂无数据',
  ariaLabel: '柱状图',
});

const theme = useChartTheme();
const option = computed(() =>
  buildBarChartOption({ ...props, theme: theme.value }),
);
const empty = computed(() => !hasCartesianData(props.series));
</script>

<template>
  <BaseChart
    v-bind="$attrs"
    :option="option"
    :loading="loading"
    :empty="empty"
    :animation="animation"
    :height="height"
    :empty-text="emptyText"
    :aria-label="ariaLabel"
  />
</template>
