import type { TableColumnsType, TablePaginationConfig } from 'antdv-next';
import { mount } from '@vue/test-utils';
import { computed, nextTick, ref, shallowRef } from 'vue';
import type { DefineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import ProTable from '@/components/ProTable.vue';
import type { UseTableReturn } from '@/composables/use-table';

interface Row {
  id: number;
  name: string;
}

const componentStubs = vi.hoisted(() => ({
  checkbox: {
    name: 'ACheckbox',
    template: '<label><slot /></label>',
  },
  checkboxGroup: {
    name: 'ACheckboxGroup',
    template: '<div><slot /></div>',
  },
  popover: {
    name: 'APopover',
    template: '<div><slot /><slot name="content" /></div>',
  },
  table: {
    name: 'ATable',
    props: {
      columns: Array,
      dataSource: Array,
      loading: Boolean,
      pagination: [Boolean, Object],
      rowKey: String,
      scroll: Object,
      size: String,
      expandedRowKeys: Array,
    },
    emits: ['update:expandedRowKeys'],
    template:
      '<div data-testid="table"><slot name="bodyCell" :column="{ key: \'name\' }" :record="{ id: 1, name: \'admin\' }" /><button data-testid="expand" @click="$emit(\'update:expandedRowKeys\', [1])" /></div>',
  },
}));

vi.mock('antdv-next', () => ({
  Checkbox: componentStubs.checkbox,
  CheckboxGroup: componentStubs.checkboxGroup,
  Popover: componentStubs.popover,
  Table: componentStubs.table,
}));

const columns: TableColumnsType<Row> = [
  { title: '名称', dataIndex: 'name', key: 'name' },
];

type PresentableRowTable = Pick<
  UseTableReturn<Row>,
  'columns' | 'list' | 'loading'
> &
  Partial<Pick<UseTableReturn<Row>, 'pagination' | 'rowOffset'>> & {
    reload: () => unknown;
  };

const TableForRow = ProTable as unknown as DefineComponent<{
  table: PresentableRowTable;
  rowKey?: string;
  showIndex?: boolean;
  pagination?: boolean;
  expandedRowKeys?: Array<string | number>;
  'onUpdate:expandedRowKeys'?: (keys: Array<string | number>) => void;
}>;

function mountTable(withBodyCell = false) {
  const reload = vi.fn(async () => true);
  const table = {
    columns,
    list: shallowRef<Row[]>([{ id: 1, name: 'admin' }]),
    loading: ref(false),
    pagination: computed<TablePaginationConfig>(() => ({
      current: 3,
      pageSize: 10,
      total: 21,
    })),
    rowOffset: computed(() => 20),
    reload,
  } satisfies PresentableRowTable;
  const wrapper = mount(TableForRow, {
    props: { table, rowKey: 'id' },
    slots: withBodyCell
      ? {
          bodyCell: ({ record }: { record: Row }) => `自定义：${record.name}`,
        }
      : undefined,
  });

  return { reload, table, wrapper };
}

describe('ProTable', () => {
  it('挂载时加载数据，并把列表、分页和 loading 传给表格', async () => {
    const { reload, table, wrapper } = mountTable();
    await nextTick();

    const renderedTable = wrapper.getComponent(componentStubs.table);

    expect(reload).toHaveBeenCalledOnce();
    expect(renderedTable.props('dataSource')).toEqual(table.list.value);
    expect(renderedTable.props('loading')).toBe(false);
    expect(renderedTable.props('pagination')).toMatchObject({
      current: 3,
      pageSize: 10,
      total: 21,
      showQuickJumper: true,
    });
  });

  it('序号使用 rowOffset，刷新按钮复用 reload', async () => {
    const { reload, wrapper } = mountTable();
    await nextTick();

    const renderedColumns = wrapper
      .getComponent(componentStubs.table)
      .props('columns') as TableColumnsType<Row>;
    const indexColumn = renderedColumns[0] as {
      render: (value: unknown, record: Row, index: number) => string;
    };

    expect(indexColumn.render(undefined, { id: 1, name: 'admin' }, 2)).toBe('23');

    await wrapper.get('button[title="刷新"]').trigger('click');
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('继续向 a-table 转发 bodyCell 插槽', async () => {
    const { wrapper } = mountTable(true);
    await nextTick();

    expect(wrapper.get('[data-testid="table"]').text()).toContain('自定义：admin');
  });

  it('支持无分页树数据并转发展开行双向绑定', async () => {
    const reload = vi.fn(async () => undefined);
    const onExpandedRowKeys = vi.fn();
    const table = {
      columns,
      list: shallowRef<Row[]>([{ id: 1, name: '系统管理' }]),
      loading: ref(false),
      reload,
    } satisfies PresentableRowTable;
    const wrapper = mount(TableForRow, {
      props: {
        table,
        showIndex: false,
        pagination: false,
        expandedRowKeys: [1],
        'onUpdate:expandedRowKeys': onExpandedRowKeys,
      },
    });
    await nextTick();

    const renderedTable = wrapper.getComponent(componentStubs.table);

    expect(reload).toHaveBeenCalledOnce();
    expect(renderedTable.props('pagination')).toBe(false);
    expect(renderedTable.props('expandedRowKeys')).toEqual([1]);
    expect(renderedTable.props('columns')).toEqual(columns);

    await wrapper.get('[data-testid="expand"]').trigger('click');
    expect(onExpandedRowKeys).toHaveBeenCalledWith([1]);
  });
});
