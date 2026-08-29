<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import { computed } from 'vue';
import VChart from 'vue-echarts';

import '../echarts';

defineOptions({ name: 'BaseChart', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    option: EChartsOption;
    loading?: boolean;
    empty?: boolean;
    animation?: boolean;
    height?: number | string;
    emptyText?: string;
    ariaLabel?: string;
  }>(),
  {
    loading: false,
    empty: false,
    animation: undefined,
    height: undefined,
    emptyText: '暂无数据',
    ariaLabel: '数据图表',
  },
);

const chartStyle = computed(() => {
  if (props.height === undefined) return undefined;
  return {
    height:
      typeof props.height === 'number' ? `${props.height}px` : props.height,
  };
});

const resolvedOption = computed<EChartsOption>(() =>
  props.animation === undefined
    ? props.option
    : { ...props.option, animation: props.animation },
);
</script>

<template>
  <div
    v-bind="$attrs"
    class="relative min-h-60 w-full"
    :style="chartStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <VChart
      v-if="loading || !empty"
      class="absolute inset-0 h-full w-full"
      :option="resolvedOption"
      :loading="loading"
      autoresize
    />
    <div v-else class="absolute inset-0 flex items-center justify-center">
      <a-empty :description="emptyText" />
    </div>
  </div>
</template>
