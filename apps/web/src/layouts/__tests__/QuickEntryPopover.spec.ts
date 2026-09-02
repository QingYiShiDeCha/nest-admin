import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';

import type { MenuNode } from '@nest-admin/shared';
import QuickEntryPopover from '@/layouts/components/quick-entry-popover/index.vue';
import { useMenuStore } from '@/stores/menu';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('antdv-next', () => ({
  Empty: {
    name: 'AEmpty',
    props: { description: String },
    template: '<div>{{ description }}</div>',
  },
  Input: {
    name: 'AInput',
    props: { value: String },
    emits: ['update:value'],
    template: '<div><slot name="prefix" /></div>',
  },
  Popover: {
    name: 'APopover',
    props: { open: Boolean },
    emits: ['update:open'],
    template: '<div><slot /><slot name="content" /></div>',
  },
}));

function createNode(
  id: number,
  name: string,
  path: string,
  type: MenuNode['type'] = 'menu',
): MenuNode {
  return {
    id,
    parentId: null,
    name,
    type,
    path,
    component: type === 'menu' ? 'system/example/index' : null,
    icon: 'RiApps2Line',
    sort: id,
    visible: true,
    keepAlive: false,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    children: [],
  };
}

describe('QuickEntryPopover', () => {
  it('展示授权菜单，并分别打开内部路由和外链', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const menu = useMenuStore(pinia);
    menu.tree = [
      createNode(1, '用户管理', '/system/user'),
      createNode(2, '接口文档', 'http://localhost:3000/api/docs', 'external'),
    ];
    const openWindow = vi.fn();
    vi.stubGlobal('open', openWindow);
    const wrapper = mount(QuickEntryPopover, {
      global: { plugins: [pinia] },
      slots: { trigger: '<button type="button">快捷入口</button>' },
    });

    await wrapper.get('button[title="用户管理"]').trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/system/user');

    await wrapper.get('button[title="接口文档"]').trigger('click');
    expect(openWindow).toHaveBeenCalledWith(
      'http://localhost:3000/api/docs',
      '_blank',
      'noopener',
    );

    vi.unstubAllGlobals();
  });
});
