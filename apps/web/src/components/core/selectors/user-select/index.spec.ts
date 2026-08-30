import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UserListItem } from '@nest-admin/shared';

import { apiUserPage } from '@/api/users';

import UserSelect from './index.vue';

vi.mock('@/api/users', () => ({ apiUserPage: vi.fn() }));
vi.mock('antdv-next', () => ({
  App: { useApp: () => ({ message: { error: vi.fn() } }) },
  Select: {
    name: 'ASelect',
    inheritAttrs: false,
    props: ['value', 'options', 'loading'],
    emits: ['update:value', 'search', 'dropdown-visible-change'],
    template: '<div data-testid="select" />',
  },
}));

const user = (overrides: Partial<UserListItem> = {}): UserListItem => ({
  id: 1,
  deptId: 2,
  username: 'zhangsan',
  nickname: '张三',
  email: null,
  phone: null,
  avatar: null,
  status: 'active',
  lastLoginAt: null,
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
  postNames: [],
  ...overrides,
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('UserSelect', () => {
  it('编辑时先用负责人展示名回显，展开后加载启用用户', async () => {
    vi.mocked(apiUserPage).mockResolvedValue({
      list: [user()],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const wrapper = mount(UserSelect, {
      props: { modelValue: 8, initialLabel: '现任负责人' },
    });
    const select = wrapper.findComponent({ name: 'ASelect' });

    expect(select.props('options')).toEqual([
      expect.objectContaining({ value: 8, label: '现任负责人' }),
    ]);
    expect(apiUserPage).not.toHaveBeenCalled();

    select.vm.$emit('dropdown-visible-change', true);
    await flushPromises();

    expect(apiUserPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      keyword: undefined,
      status: 'active',
    });
    expect(select.props('options')).toEqual([
      expect.objectContaining({ value: 8, label: '现任负责人' }),
      expect.objectContaining({ value: 1, label: '张三' }),
    ]);
  });

  it('搜索输入防抖 300ms 并去除首尾空格', async () => {
    vi.useFakeTimers();
    vi.mocked(apiUserPage).mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    const wrapper = mount(UserSelect);
    const select = wrapper.findComponent({ name: 'ASelect' });

    select.vm.$emit('search', '  李四  ');
    await vi.advanceTimersByTimeAsync(299);
    expect(apiUserPage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(apiUserPage).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: '李四', status: 'active' }),
    );
  });
});
