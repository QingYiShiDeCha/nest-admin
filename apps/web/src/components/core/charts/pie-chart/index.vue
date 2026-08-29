<script setup lang="ts">
import { computed } from 'vue';

import BaseChart from '../base-chart/index.vue';
import { buildPieChartOption } from '../options';
import type { PieChartProps } from '../types';
import { useChartTheme } from '../use-chart-theme';

defineOptions({ name: 'PieChart', inheritAttrs: false });

const props = withDefaults(defineProps<PieChartProps>(), {
  animation: true,
  loading: false,
  innerRadius: 0,
  outerRadius: '82%',
  showLegend: false,
  showLabel: false,
  emptyText: '暂无数据',
  ariaLabel: '饼图',
});

const theme = useChartTheme();
const option = computed(() =>
  buildPieChartOption({ ...props, theme: theme.value }),
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
