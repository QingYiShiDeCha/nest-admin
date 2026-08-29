<script setup lang="ts" generic="T extends object, F extends object = Record<string, unknown>">
import type { TableColumnsType } from 'antdv-next';
import { computed, onMounted, ref } from 'vue';

import type { UseTableReturn } from '@/composables/use-table';

/**
 * 表格卡片：工具栏 + a-table + 分页，纵向撑满父容器的剩余空间。
 *
 * 查询区在独立的 ProSearch 里，页面按需组合两者。
 *
 * 撑满的实现：scroll.y 触发 antd 把表头/表体拆成两个区块，再用一条
 * flex 覆盖链让表体 flex-1——数据少时白底到底、分页钉在卡片底部，
 * 数据多时表体内部滚动。antd 内部类名属于第三方实现细节，
 * 这条链是组件与库版本之间的耦合点，升级 antdv-next 时需回归验证。
 *
 * 样式约束：只用 UnoCSS 工具类，不写 <style> 块。
 */

const props = withDefaults(
  defineProps<{
    /** 页面创建的 useTable 实例 */
    table: UseTableReturn<T, F>;
    columns: TableColumnsType<T>;
    rowKey?: string;
    /** 是否自动加「序号」列（按当前页码续算） */
    showIndex?: boolean;
  }>(),
  {
    rowKey: 'id',
    showIndex: true,
  },
);

// 挂载即首查；KeepAlive 下实例常驻，重复激活不会重复请求
onMounted(() => {
  void props.table.run();
});

// ---- 工具栏：密度 / 全屏 ----

const DENSITY = ['large', 'middle', 'small'] as const;
const densityIndex = ref(0);
const tableSize = computed(() => DENSITY[densityIndex.value]!);

function cycleDensity(): void {
  densityIndex.value = (densityIndex.value + 1) % DENSITY.length;
}

const fullscreen = ref(false);

/** 根容器：常态随父容器撑满；全屏时脱离文档流铺满视口 */
const rootClass = computed(() =>
  fullscreen.value
    ? 'fixed inset-0 z-1000 overflow-auto bg-white p-4'
    : 'flex flex-col gap-4 flex-1 min-h-0',
);

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

  const base: TableColumnsType<T> = props.showIndex
    ? [indexColumn, ...props.columns]
    : [...props.columns];

  // 序号列不在显隐清单里（始终显示），其余按勾选状态过滤
  return base.filter(
    (col) => columnKey(col) === '__index' || visibleKeys.value.includes(columnKey(col)),
  );
});

/**
 * 让 antd 表格在卡片内撑满的覆盖链：
 * wrapper/Spin/容器逐层 flex，表体 flex-1 且解除 scroll.y 的 max-height，
 * 分页保持在卡片底部。
 */
const stretchChain =
  '[&_.ant-table-wrapper]:h-full [&_.ant-table-wrapper]:flex [&_.ant-table-wrapper]:flex-col ' +
  '[&_.ant-spin]:flex-1 [&_.ant-spin]:min-h-0 [&_.ant-spin]:overflow-hidden ' +
  '[&_.ant-spin-container]:h-full [&_.ant-spin-container]:flex [&_.ant-spin-container]:flex-col ' +
  '[&_.ant-table]:flex-1 [&_.ant-table]:min-h-0 [&_.ant-table]:flex [&_.ant-table]:flex-col ' +
  '[&_.ant-table-container]:flex-1 [&_.ant-table-container]:min-h-0 [&_.ant-table-container]:flex [&_.ant-table-container]:flex-col ' +
  '[&_.ant-table-header]:shrink-0 ' +
  '[&_.ant-table-body]:flex-1 [&_.ant-table-body]:min-h-0 [&_.ant-table-body]:!max-h-none [&_.ant-table-body]:!overflow-y-auto';
</script>

<template>
  <div :class="[rootClass, stretchChain]">
    <!-- 表格卡片 -->
    <div class="bg-white rounded-lg p-4 flex-1 min-h-0 flex flex-col">
      <div class="flex items-center justify-between pb-4 shrink-0">
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

      <!-- scroll.y 只为触发表头/表体分离，高度由覆盖链接管 -->
      <a-table
        :row-key="rowKey"
        :columns="visibleColumns"
        :data-source="table.list.value"
        :loading="table.loading.value"
        :pagination="{ ...table.pagination.value, showQuickJumper: true }"
        :size="tableSize"
        :scroll="{ y: 200 }"
      >
        <template #bodyCell="slotProps">
          <slot name="bodyCell" v-bind="slotProps" />
        </template>
      </a-table>
    </div>
  </div>
</template>
