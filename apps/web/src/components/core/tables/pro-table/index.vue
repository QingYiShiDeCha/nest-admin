<script setup lang="ts" generic="T extends object">
import type { MenuProps, TableColumnsType } from 'antdv-next';
import { computed, onMounted, ref } from 'vue';

import type { UseTableReturn } from '@/composables/use-table';

type PresentableTable<T extends object> = Pick<
  UseTableReturn<T>,
  'columns' | 'list' | 'loading'
> &
  Partial<Pick<UseTableReturn<T>, 'pagination' | 'rowOffset'>> & {
    reload: () => unknown;
  };

type RowKey = string | number;

/**
 * 表格卡片：工具栏 + a-table + 可选分页，纵向撑满父容器的剩余空间。
 *
 * 查询区在独立的 ProSearch 里，页面按需组合两者。
 *
 * scroll.y 触发 antd 拆分表头和表体；flex 高度链会先为工具栏和分页
 * 保留空间，再让表体占满剩余高度并独立滚动。
 *
 * 样式约束：只用 UnoCSS 工具类，不写 <style> 块。
 */

const props = withDefaults(
  defineProps<{
    /** useTable 实例，或结构一致的一次性/树形数据适配器 */
    table: PresentableTable<T>;
    rowKey?: string;
    /** 是否自动加「序号」列（按当前页码续算） */
    showIndex?: boolean;
    /** 树表格等一次性数据源可关闭分页 */
    pagination?: boolean;
    /** 树形数据的受控展开行 */
    expandedRowKeys?: RowKey[];
  }>(),
  {
    rowKey: 'id',
    showIndex: true,
    pagination: true,
  },
);

const emit = defineEmits<{
  'update:expandedRowKeys': [keys: RowKey[]];
}>();

// 挂载即首查；KeepAlive 下实例常驻，重复激活不会重复请求
onMounted(() => {
  void props.table.reload();
});

// ---- 工具栏：密度 / 全屏 ----

type TableDensity = 'large' | 'middle' | 'small';

const DENSITY_LABELS: Record<TableDensity, string> = {
  large: '宽松',
  middle: '默认',
  small: '紧凑',
};
const densityItems: MenuProps['items'] = [
  { key: 'large', label: DENSITY_LABELS.large },
  { key: 'middle', label: DENSITY_LABELS.middle },
  { key: 'small', label: DENSITY_LABELS.small },
];
const tableSize = ref<TableDensity>('middle');
const densityLabel = computed(() => DENSITY_LABELS[tableSize.value]);

const handleDensityChange: NonNullable<MenuProps['onClick']> = ({ key }) => {
  if (key === 'large' || key === 'middle' || key === 'small') {
    tableSize.value = key;
  }
};

const fullscreen = ref(false);

/** 根容器：常态随父容器撑满；全屏时脱离文档流铺满视口 */
const rootClass = computed(() =>
  fullscreen.value
    ? 'fixed inset-0 z-1000 overflow-auto a-bg-layout p-4 flex flex-col min-h-0'
    : 'flex flex-col gap-4 flex-1 min-h-0',
);

/** 工具栏小方按钮的公共样式（无 <style> 块，只能集中在脚本里） */
const iconBtn =
  'inline-grid place-items-center w-8 h-8 border a-border-border rounded a-bg-container a-color-text-secondary text-base cursor-pointer hover:text-primary hover:border-primary';

// ---- 列显隐 ----

const columnKey = (col: { key?: unknown; dataIndex?: unknown }): string =>
  String(col.key ?? col.dataIndex);

const visibleKeys = ref<string[]>(props.table.columns.map(columnKey));

const visibleColumns = computed<TableColumnsType<T>>(() => {
  const indexColumn: TableColumnsType<T>[number] = {
    title: '序号',
    key: '__index',
    width: 64,
    render: (_value, _record, index) =>
      String((props.table.rowOffset?.value ?? 0) + index + 1),
  };

  const base: TableColumnsType<T> = props.showIndex
    ? [indexColumn, ...props.table.columns]
    : [...props.table.columns];

  // 序号列不在显隐清单里（始终显示），其余按勾选状态过滤
  return base.filter(
    (col) =>
      columnKey(col) === '__index' ||
      visibleKeys.value.includes(columnKey(col)),
  );
});

const resolvedPagination = computed(() => {
  if (!props.pagination || !props.table.pagination) {
    return false;
  }

  return {
    ...props.table.pagination.value,
    size: 'middle' as const,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    pageSize: props.table.pagination.value.pageSize ?? 20,
  };
});

function handleExpandedRowKeys(keys: readonly RowKey[]): void {
  emit('update:expandedRowKeys', [...keys]);
}

const stretchChain =
  '[&_.ant-table-wrapper]:flex-1 [&_.ant-table-wrapper]:min-h-0 [&_.ant-table-wrapper]:flex [&_.ant-table-wrapper]:flex-col ' +
  '[&_.ant-spin]:flex-1 [&_.ant-spin]:min-h-0 [&_.ant-spin]:overflow-hidden [&_.ant-spin]:flex [&_.ant-spin]:flex-col ' +
  '[&_.ant-spin-container]:flex-1 [&_.ant-spin-container]:min-h-0 [&_.ant-spin-container]:flex [&_.ant-spin-container]:flex-col ' +
  '[&_.ant-table]:flex-1 [&_.ant-table]:min-h-0 [&_.ant-table]:flex [&_.ant-table]:flex-col ' +
  '[&_.ant-table-container]:flex-1 [&_.ant-table-container]:min-h-0 [&_.ant-table-container]:flex [&_.ant-table-container]:flex-col ' +
  '[&_.ant-table-header]:shrink-0 ' +
  '[&_.ant-table-body]:flex-1 [&_.ant-table-body]:min-h-0 [&_.ant-table-body]:!max-h-none [&_.ant-table-body]:!overflow-y-auto ' +
  '[&_.ant-pagination]:shrink-0';
</script>

<template>
  <div :class="[rootClass, stretchChain]">
    <!-- 表格卡片 -->
    <div
      class="a-bg-container rounded-lg border border-solid a-border-border-secondary p-4 flex-1 min-h-0 overflow-hidden flex flex-col"
    >
      <div class="flex items-center justify-between pb-4 shrink-0">
        <slot name="toolbar" />

        <div class="flex items-center gap-2 ml-auto">
          <button
            :class="iconBtn"
            type="button"
            title="刷新"
            @click="table.reload()"
          >
            <i class="i-ri:refresh-line" />
          </button>

          <a-popover trigger="click" placement="bottomRight">
            <template #content>
              <a-checkbox-group
                v-model:value="visibleKeys"
                class="flex flex-col gap-1.5"
              >
                <a-checkbox
                  v-for="col in table.columns"
                  :key="columnKey(col)"
                  :value="columnKey(col)"
                >
                  {{ String(col.title) }}
                </a-checkbox>
              </a-checkbox-group>
            </template>
            <button :class="iconBtn" type="button" title="列显隐">
              <i class="i-ri:settings-3-line" />
            </button>
          </a-popover>

          <a-dropdown
            :trigger="['click']"
            :menu="{
              items: densityItems,
              selectable: true,
              selectedKeys: [tableSize],
              onClick: handleDensityChange,
            }"
          >
            <button
              class="inline-flex items-center justify-center gap-0.5 h-8 px-2 border a-border-border rounded a-bg-container a-color-text-secondary text-base cursor-pointer hover:text-primary hover:border-primary"
              type="button"
              :title="`密度：${densityLabel}`"
            >
              <i class="i-ri:line-height" />
            </button>
          </a-dropdown>

          <button
            :class="iconBtn"
            type="button"
            :title="fullscreen ? '退出全屏' : '全屏'"
            @click="fullscreen = !fullscreen"
          >
            <i
              :class="
                fullscreen
                  ? 'i-ri:fullscreen-exit-line'
                  : 'i-ri:fullscreen-line'
              "
            />
          </button>
        </div>
      </div>

      <a-table
        :row-key="rowKey"
        :columns="visibleColumns"
        :data-source="table.list.value"
        :loading="table.loading.value"
        :pagination="resolvedPagination"
        :size="tableSize"
        :scroll="{ y: 200 }"
        :expanded-row-keys="expandedRowKeys"
        @update:expanded-row-keys="handleExpandedRowKeys"
      >
        <template #bodyCell="slotProps">
          <slot name="bodyCell" v-bind="slotProps" />
        </template>
      </a-table>
    </div>
  </div>
</template>
