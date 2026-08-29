import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import type { DefineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type {
  FilterField,
  SearchableTable,
} from '@/components/core/tables/pro-search/types';

interface Filters {
  keyword: string;
}

const componentStubs = vi.hoisted(() => ({
  button: {
    name: 'AButton',
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  input: {
    name: 'AInput',
    props: { value: String },
    emits: ['update:value', 'pressEnter'],
    template:
      '<input data-testid="filter-input" :value="value" @input="$emit(\'update:value\', $event.target.value)" @keyup.enter="$emit(\'pressEnter\')" />',
  },
  select: {
    name: 'ASelect',
    template: '<select />',
  },
}));

vi.mock('antdv-next', () => ({
  Button: componentStubs.button,
  Input: componentStubs.input,
  Select: componentStubs.select,
}));

const fields: FilterField<Filters>[] = [{ label: '关键词', key: 'keyword' }];

const SearchForFilters = ProSearch as unknown as DefineComponent<{
  table: SearchableTable<Filters>;
  fields: FilterField<Filters>[];
}>;

function mountSearch() {
  const filters = reactive<Filters>({ keyword: '' });
  const search = vi.fn(async () => true);
  const reset = vi.fn(async () => true);
  const wrapper = mount(SearchForFilters, {
    props: { table: { filters, search, reset }, fields },
  });

  return { filters, reset, search, wrapper };
}

describe('ProSearch', () => {
  it('把输入值写回 filters，并在回车和查询按钮触发 search', async () => {
    const { filters, search, wrapper } = mountSearch();

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['border', 'border-solid', 'a-border-border-secondary']),
    );

    await wrapper.get('[data-testid="filter-input"]').setValue('admin');
    await wrapper.get('[data-testid="filter-input"]').trigger('keyup.enter');
    await wrapper.findAll('button').find((button) => button.text().includes('查 询'))!.trigger('click');

    expect(filters.keyword).toBe('admin');
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('重置按钮只调用封装后的 reset 命令', async () => {
    const { reset, search, wrapper } = mountSearch();

    await wrapper.findAll('button').find((button) => button.text().includes('重 置'))!.trigger('click');

    expect(reset).toHaveBeenCalledOnce();
    expect(search).not.toHaveBeenCalled();
  });
});
