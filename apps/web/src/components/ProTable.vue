<script setup lang="ts" generic="T extends object, F extends object = Record<string, unknown>">
import type { TableColumnsType } from 'antdv-next';
import { computed, onMounted, ref } from 'vue';

import type { UseTableReturn } from '@/composables/use-table';

/**
 * 表格页的二次封装：查询区 + 工具栏 + a-table 三段式，对齐参考设计。
 *
 * 只封装「每一页都长一样」的部分；与数据相关的能力仍在 useTable
 * （竞态防护、翻页回拉、失败保数据），本组件持有页面的 table 实例，
 * 增删改后由页面自己调 table.run()/search() 刷新。
 *
 * 样式约束：本组件只用 UnoCSS 工具类，不写 <style> 块
 * （scripts/no-native-css.mjs 强制）。
 */

export interface FilterField {
  label: string;
  /**
   * input/select 类型对应 table.filters 的键；
   * custom 类型由页面用 #filter-<key> 插槽提供控件，键名任意
   */
  key: string;
  type?: 'input' | 'select' | 'custom';
  /** select 类型的选项 */
  options?: { label: string; value: string | number }[];
  placeholder?: string;
}

const props = withDefaults(
  defineProps<{
    /** 页面创建的 useTable 实例 */
    table: UseTableReturn<T, F>;
    columns: TableColumnsType<T>;
    rowKey?: string;
    /** 查询区字段配置，声明了才渲染查询区 */
    filters?: FilterField[];
    /** 是否自动加「序号」列（按当前页码续算） */
    showIndex?: boolean;
  }>(),
  {
    rowKey: 'id',
    filters: () => [],
    showIndex: true,
  },
);

// ---- 工具栏：密度 / 全屏 ----

const DENSITY = ['large', 'middle', 'small'] as const;
const densityIndex = ref(0);
const tableSize = computed(() => DENSITY[densityIndex.value]!);

function cycleDensity(): void {
  densityIndex.value = (densityIndex.value + 1) % DENSITY.length;
}

const fullscreen = ref(false);

/** 工具栏小方按钮的公共样式（无 <style> 块，只能集中在脚本里） */
const iconBtn =
  'inline-grid place-items-center w-7 h-7 border border-[#e5e6eb] rounded bg-white text-[#4e5969] text-14px cursor-pointer hover:text-primary hover:border-primary';

// ---- 列显隐 ----

const columnKey = (col: { key?: unknown; dataIndex?: unknown }): string =>
  String(col.key ?? col.dataIndex);

const visibleKeys = ref<string[]>(props.columns.map(columnKey));

const visibleColumns = computed<TableColumnsType<T>>(() => {
  const indexColumn: TableColumnsType<T>[number] = {
    title: '序号',
    key: '__index',
    width: 64,
    render: (_value, _record, index) =>
      String((props.table.page.value - 1) * props.table.pageSize.value + index + 1),
  };

  const base: TableColumnsType<T> = props.showIndex ? [indexColumn, ...props.columns] : [...props.columns];

  // 序号列不在显隐清单里（始终显示），其余按勾选状态过滤
  return base.filter(
    (col) => columnKey(col) === '__index' || visibleKeys.value.includes(columnKey(col)),
  );
});

// 挂载即首查；KeepAlive 下实例常驻，重复激活不会重复请求
onMounted(() => {
  void props.table.run();
});

// ---- 查询区 ----

/**
 * 查询区回写筛选值。不直接在模板里 v-model 到 props 上：
 * filters 状态归 useTable 所有，经函数改写既是设计意图，
 * 也绕开 vue/no-mutating-props 对模板表达式的限制。
 */
const filterValues = computed(() => props.table.filters as Record<string, unknown>);

function setFilter(key: string, value: unknown): void {
  filterValues.value[key] = value;
}

function resetFilters(): void {
  props.table.resetFilters();
  void props.table.search();
}
</script>

<template>
  <div :class="fullscreen ? 'fixed inset-0 z-1000 overflow-auto bg-white p-4' : 'flex flex-col gap-4'">
    <!-- 查询区：label 左置，字段间横排换行 -->
    <div
      v-if="filters.length > 0"
      class="bg-white rounded-lg p-4 flex flex-wrap items-center gap-x-6 gap-y-3"
    >
      <div v-for="field in filters" :key="field.key" class="flex items-center gap-2">
        <span class="text-sm text-[#4e5969] whitespace-nowrap">{{ field.label }}</span>
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
        <a-button @click="resetFilters">重 置</a-button>
        <a-button type="primary" @click="table.search()">查 询</a-button>
      </div>
    </div>

    <!-- 表格卡片：工具栏 + 表格 -->
    <div class="bg-white rounded-lg p-4">
      <div class="flex items-center justify-between pb-4">
        <slot name="toolbar" />

        <div class="flex items-center gap-2 ml-auto">
          <button :class="iconBtn" type="button" title="刷新" @click="table.run()">
            <i class="i-ant-design:reload-outlined" />
          </button>

          <a-popover trigger="click" placement="bottomRight">
            <template #content>
              <a-checkbox-group v-model:value="visibleKeys" class="flex flex-col gap-1.5">
                <a-checkbox
                  v-for="col in columns"
                  :key="columnKey(col)"
                  :value="columnKey(col)"
                >
                  {{ String(col.title) }}
                </a-checkbox>
              </a-checkbox-group>
            </template>
            <button :class="iconBtn" type="button" title="列显隐">
              <i class="i-ant-design:setting-outlined" />
            </button>
          </a-popover>

          <button :class="iconBtn" type="button" :title="`密度：${tableSize}`" @click="cycleDensity">
            <i class="i-ant-design:column-height-outlined" />
          </button>

          <button :class="iconBtn" type="button" :title="fullscreen ? '退出全屏' : '全屏'" @click="fullscreen = !fullscreen">
            <i :class="fullscreen ? 'i-ant-design:fullscreen-exit-outlined' : 'i-ant-design:fullscreen-outlined'" />
          </button>
        </div>
      </div>

      <a-table
        :row-key="rowKey"
        :columns="visibleColumns"
        :data-source="table.list.value"
        :loading="table.loading.value"
        :pagination="{ ...table.pagination.value, showQuickJumper: true }"
        :size="tableSize"
      >
        <template #bodyCell="slotProps">
          <slot name="bodyCell" v-bind="slotProps" />
        </template>
      </a-table>
    </div>
  </div>
</template>
