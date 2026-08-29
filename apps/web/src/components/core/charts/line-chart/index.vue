<script setup lang="ts">
import { computed } from 'vue';

import BaseChart from '../base-chart/index.vue';
import { buildLineChartOption, hasCartesianData } from '../options';
import type { LineChartProps } from '../types';
import { useChartTheme } from '../use-chart-theme';

defineOptions({ name: 'LineChart', inheritAttrs: false });

const props = withDefaults(defineProps<LineChartProps>(), {
  animation: true,
  loading: false,
  smooth: true,
  area: false,
  emptyText: '暂无数据',
  ariaLabel: '折线图',
});

const theme = useChartTheme();
const option = computed(() =>
  buildLineChartOption({ ...props, theme: theme.value }),
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
