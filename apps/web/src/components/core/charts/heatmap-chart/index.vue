<script setup lang="ts">
import { computed } from 'vue';

import BaseChart from '../base-chart/index.vue';
import { buildHeatmapChartOption } from '../options';
import type { HeatmapChartProps } from '../types';
import { useChartTheme } from '../use-chart-theme';

defineOptions({ name: 'HeatmapChart', inheritAttrs: false });

const props = withDefaults(defineProps<HeatmapChartProps>(), {
  animation: true,
  loading: false,
  min: 0,
  showVisualMap: false,
  cellGap: 4,
  emptyText: '暂无数据',
  ariaLabel: '热力图',
});

const theme = useChartTheme();
const option = computed(() =>
  buildHeatmapChartOption({ ...props, theme: theme.value }),
);
const empty = computed(() => props.data.length === 0);
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
