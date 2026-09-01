import type { TableColumnsType } from 'antdv-next';
import { createPinia, setActivePinia } from 'pinia';
import { h, isVNode } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTable } from '@/composables/use-table';

interface Row {
  id: number;
  name: string;
}

describe('useTable columns', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('原样保留 h 函数与 TSX 列渲染器', () => {
    const hRender = (_value: unknown, record: Row) =>
      h('strong', { class: 'h-cell' }, record.name);
    const tsxRender = (_value: unknown, record: Row) => (
      <span class="tsx-cell">{record.name}</span>
    );
    const columns: TableColumnsType<Row> = [
      { title: 'H 函数', dataIndex: 'name', key: 'h', render: hRender },
      { title: 'TSX', dataIndex: 'name', key: 'tsx', render: tsxRender },
    ];
    const table = useTable<Row>({
      columns,
      fetcher: vi.fn(async () => ({
        list: [],
        total: 0,
        page: 1,
        pageSize: 10,
      })),
    });
    const row = { id: 1, name: 'admin' };

    expect(table.columns).toBe(columns);
    expect(table.columns[0]?.render).toBe(hRender);
    expect(table.columns[1]?.render).toBe(tsxRender);
    expect(isVNode(hRender(undefined, row))).toBe(true);
    expect(isVNode(tsxRender(undefined, row))).toBe(true);
  });
});
