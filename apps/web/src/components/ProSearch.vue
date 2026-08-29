<script setup lang="ts" generic="F extends object = Record<string, unknown>">
import { computed } from 'vue';

import type { FilterField, SearchableTable } from './pro-search.types';

/**
 * 查询区卡片：字段配置驱动，label 左置横排换行，重置/查询右置。
 *
 * 与 ProTable 分开封装：有些页面（如日志）只需要查询区 + 自己的表格，
 * 也便于未来单独换掉查询区的布局。
 *
 * 自定义控件用 #filter-<key> 插槽（如日志页的时间范围选择器），
 * 其值由页面自己写入 table.filters。
 *
 * 样式约束：只用 UnoCSS 工具类，不写 <style> 块。
 */

const props = defineProps<{
  table: SearchableTable<F>;
  fields: FilterField<F>[];
}>();

/** filters 是泛型，统一按字符串键值视图读写 */
const filterValues = computed(() => props.table.filters as Record<string, unknown>);

function setFilter(key: string, value: unknown): void {
  filterValues.value[key] = value;
}

function reset(): void {
  void props.table.reset();
}
</script>

<template>
  <div class="a-bg-container rounded-lg p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
    <div v-for="field in fields" :key="field.key" class="flex items-center gap-2">
      <span class="text-sm a-color-text-secondary whitespace-nowrap">{{ field.label }}</span>
      <a-input
        v-if="(field.type ?? 'input') === 'input'"
        class="w-52"
        :value="filterValues[field.key] as string"
        :placeholder="field.placeholder ?? `请输入${field.label}`"
        allow-clear
        @update:value="setFilter(field.key, $event)"
        @press-enter="table.search()"
      />
      <a-select
        v-else-if="field.type === 'select'"
        class="w-40"
        :value="filterValues[field.key]"
        :options="field.options"
        :placeholder="field.placeholder ?? `请选择${field.label}`"
        allow-clear
        @update:value="setFilter(field.key, $event)"
      />
      <!-- 自定义字段：由页面用 #filter-<key> 插槽提供控件 -->
      <slot v-else :name="`filter-${field.key}`" />
    </div>

    <div class="ml-auto flex gap-2">
      <a-button @click="reset">重 置</a-button>
      <a-button type="primary" @click="table.search()">查 询</a-button>
    </div>
  </div>
</template>
