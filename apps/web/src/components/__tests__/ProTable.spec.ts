import type { TableColumnsType, TablePaginationConfig } from 'antdv-next';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { computed, h, nextTick, ref, shallowRef } from 'vue';
import type { DefineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import ProTable from '@/components/core/tables/pro-table/index.vue';
import type { UseTableReturn } from '@/composables/use-table';
import { useSettingsStore } from '@/stores/settings';

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
  dropdown: {
    name: 'ADropdown',
    props: {
      menu: Object,
      trigger: Array,
    },
    template: '<div data-testid="dropdown"><slot /></div>',
  },
  empty: {
    name: 'AEmpty',
    props: { classes: Object, description: String, styles: Object },
    template: '<div data-testid="empty">{{ description }}</div>',
  },
  pagination: {
    name: 'APagination',
    props: {
      current: Number,
      pageSize: Number,
      simple: Boolean,
      showQuickJumper: Boolean,
      showSizeChanger: Boolean,
      total: Number,
    },
    template: '<div data-testid="mobile-pagination" />',
  },
  popover: {
    name: 'APopover',
    template: '<div><slot /><slot name="content" /></div>',
  },
  spin: {
    name: 'ASpin',
    props: { spinning: Boolean },
    template: '<div data-testid="spin"><slot /></div>',
  },
  table: {
    name: 'ATable',
    props: {
      columns: Array,
      dataSource: Array,
      loading: Boolean,
      locale: Object,
      pagination: [Boolean, Object],
      rowKey: String,
      scroll: Object,
      size: String,
      expandedRowKeys: Array,
      expandable: Object,
    },
    emits: ['update:expandedRowKeys'],
    template:
      '<div data-testid="table"><slot name="bodyCell" :column="{ key: \'name\' }" :record="{ id: 1, name: \'admin\' }" /><button data-testid="expand" @click="$emit(\'update:expandedRowKeys\', [1])" /></div>',
  },
}));

vi.mock('antdv-next', () => ({
  Checkbox: componentStubs.checkbox,
  CheckboxGroup: componentStubs.checkboxGroup,
  Dropdown: componentStubs.dropdown,
  Empty: componentStubs.empty,
  Pagination: componentStubs.pagination,
  Popover: componentStubs.popover,
  Spin: componentStubs.spin,
  Table: componentStubs.table,
}));

const columns: TableColumnsType<Row> = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    render: (value) => h('strong', `用户：${String(value)}`),
  },
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
  rowExpandable?: (record: Row) => boolean;
  'onUpdate:expandedRowKeys'?: (keys: Array<string | number>) => void;
}>;

function mountTable(withBodyCell = false, rows: Row[] = [{ id: 1, name: 'admin' }]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const settings = useSettingsStore(pinia);
  const reload = vi.fn(async () => true);
  const table = {
    columns,
    list: shallowRef<Row[]>(rows),
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
    global: { plugins: [pinia] },
    slots: withBodyCell
      ? {
          bodyCell: ({ record }: { record: Row }) => `自定义：${record.name}`,
        }
      : undefined,
  });

  return { reload, settings, table, wrapper };
}

describe('ProTable', () => {
  it('挂载时加载数据，并把列表、分页和 loading 传给表格', async () => {
    const { reload, table, wrapper } = mountTable();
    await nextTick();

    const renderedTable = wrapper.getComponent(componentStubs.table);
    const tableCard = wrapper.get('.rounded-lg');

    expect(tableCard.classes()).toEqual(
      expect.arrayContaining([
        'border',
        'border-solid',
        'a-border-border-secondary',
      ]),
    );
    expect(reload).toHaveBeenCalledOnce();
    expect(renderedTable.props('dataSource')).toEqual(table.list.value);
    expect(renderedTable.props('loading')).toBe(false);
    expect(renderedTable.props('pagination')).toMatchObject({
      current: 3,
      pageSize: 10,
      total: 21,
      size: 'middle',
      showQuickJumper: true,
    });
  });

  it('表体内部滚动，并为工具栏和分页保留独立空间', async () => {
    const { wrapper } = mountTable();
    await nextTick();

    const renderedTable = wrapper.getComponent(componentStubs.table);

    expect(renderedTable.props('scroll')).toEqual({ y: 200 });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        '[&_.ant-table-wrapper]:flex-1',
        '[&_.ant-table-wrapper]:min-h-0',
        '[&_.ant-spin]:flex-1',
        '[&_.ant-spin]:min-h-0',
        '[&_.ant-spin]:overflow-hidden',
        '[&_.ant-pagination]:shrink-0',
        '[&_.ant-table-body]:!overflow-y-auto',
      ]),
    );
    expect(wrapper.classes()).not.toContain(
      '[&_.ant-spin-nested-loading]:flex-1',
    );
    expect(wrapper.classes()).not.toContain('[&_.ant-table-wrapper]:h-full');

    const locale = renderedTable.props('locale') as {
      emptyText: () => { props: Record<string, unknown> };
    };
    const empty = locale.emptyText();
    expect(empty.props.description).toBe('暂无数据');
    expect(empty.props.classes).toMatchObject({
      root: 'h-full min-h-60 flex flex-col items-center justify-center py-6',
      image: '!h-20',
      description: 'text-[15px] a-color-text-secondary',
    });
    expect(empty.props.styles).toMatchObject({
      image: { height: '80px' },
      description: { fontSize: '15px', lineHeight: '22px' },
    });
  });

  it('无数据时让占位行撑满表体，避免空状态停在上半段', async () => {
    const { wrapper } = mountTable(false, []);
    await nextTick();

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        '[&_.ant-table-body>table]:h-full',
        '[&_.ant-table-tbody]:h-full',
        '[&_.ant-table-placeholder]:h-full',
        '[&_.ant-table-placeholder>td]:h-full',
      ]),
    );
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

    expect(indexColumn.render(undefined, { id: 1, name: 'admin' }, 2)).toBe(
      '23',
    );

    const refreshButton = wrapper.get('button[title="刷新"]');
    expect(refreshButton.classes()).toEqual(
      expect.arrayContaining(['w-8', 'h-8', 'text-base']),
    );

    await refreshButton.trigger('click');
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('通过下拉菜单切换表格密度', async () => {
    const { wrapper } = mountTable();
    await nextTick();

    const renderedTable = wrapper.getComponent(componentStubs.table);
    const dropdown = wrapper.getComponent(componentStubs.dropdown);
    const menu = dropdown.props('menu') as {
      items: Array<{ key: string; label: string }>;
      onClick: (info: { key: string }) => void;
      selectable: boolean;
      selectedKeys: string[];
    };

    expect(menu.items).toEqual([
      { key: 'large', label: '宽松' },
      { key: 'middle', label: '默认' },
      { key: 'small', label: '紧凑' },
    ]);
    expect(menu.selectable).toBe(true);
    expect(menu.selectedKeys).toEqual(['middle']);
    expect(renderedTable.props('size')).toBe('middle');

    menu.onClick({ key: 'small' });
    await nextTick();

    expect(renderedTable.props('size')).toBe('small');
    expect(renderedTable.props('pagination')).toMatchObject({ size: 'middle' });
    expect(wrapper.find('button[title="密度：紧凑"]').exists()).toBe(true);
  });

  it('继续向 a-table 转发 bodyCell 插槽', async () => {
    const { wrapper } = mountTable(true);
    await nextTick();

    expect(wrapper.get('[data-testid="table"]').text()).toContain(
      '自定义：admin',
    );
  });

  it('移动端卡片复用 columns 渲染并保留独立分页', async () => {
    const { settings, wrapper } = mountTable();
    await nextTick();

    const cards = wrapper.get('[data-testid="mobile-table-cards"]');
    const mobilePagination = wrapper.getComponent(componentStubs.pagination);

    expect(cards.classes()).toContain('md:hidden');
    expect(cards.text()).toContain('名称');
    expect(cards.get('strong').text()).toBe('用户：admin');
    expect(mobilePagination.props()).toMatchObject({
      current: 3,
      pageSize: 10,
      simple: true,
      showQuickJumper: false,
      showSizeChanger: false,
      total: 21,
    });

    settings.setBooleanLayoutSetting('mobileTableCardMode', false);
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-table-cards"]').exists()).toBe(
      false,
    );
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
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(TableForRow, {
      props: {
        table,
        showIndex: false,
        pagination: false,
        expandedRowKeys: [1],
        'onUpdate:expandedRowKeys': onExpandedRowKeys,
      },
      global: { plugins: [pinia] },
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

  it('向 a-table 转发展开条件以隐藏叶子节点按钮', async () => {
    const rowExpandable = (record: Row) => record.id === 1;
    const { wrapper } = mountTable();

    await wrapper.setProps({ rowExpandable });
    await nextTick();

    const expandable = wrapper
      .getComponent(componentStubs.table)
      .props('expandable') as {
      expandIcon: (options: {
        prefixCls: string;
        expanded: boolean;
        expandable: boolean;
        record: Row;
        onExpand: (record: Row, event: MouseEvent) => void;
      }) => { props: { class: string[] }; type: string };
      rowExpandable: (record: Row) => boolean;
    };

    expect(expandable.rowExpandable).toBe(rowExpandable);
    expect(expandable.rowExpandable({ id: 1, name: '父节点' })).toBe(true);
    expect(expandable.rowExpandable({ id: 2, name: '叶子节点' })).toBe(false);

    const leafIcon = expandable.expandIcon({
      prefixCls: 'ant-table',
      expanded: false,
      expandable: true,
      record: { id: 2, name: '叶子节点' },
      onExpand: vi.fn(),
    });

    expect(leafIcon.type).toBe('span');
    expect(leafIcon.props.class).toContain('ant-table-row-expand-icon-spaced');

    const onExpand = vi.fn();
    const parentIcon = expandable.expandIcon({
      prefixCls: 'ant-table',
      expanded: false,
      expandable: true,
      record: { id: 1, name: '父节点' },
      onExpand,
    }) as typeof leafIcon & {
      props: { onClick: (event: MouseEvent) => void };
    };

    parentIcon.props.onClick(new MouseEvent('click'));

    expect(parentIcon.type).toBe('button');
    expect(parentIcon.props.class).toContain(
      'ant-table-row-expand-icon-collapsed',
    );
    expect(onExpand).toHaveBeenCalledOnce();
  });
});
