import type { BreadcrumbProps } from 'antdv-next';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminBreadcrumb from '@/layouts/components/AdminBreadcrumb.vue';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  route: {
    meta: { title: '用户管理' },
    path: '/system/user',
  },
  sidebarTree: [
    {
      id: 2,
      name: '系统管理',
      path: null,
      children: [
        {
          id: 3,
          name: '用户管理',
          path: '/system/user',
          children: [],
        },
      ],
    },
  ],
}));

const breadcrumbStub = vi.hoisted(() => ({
  name: 'ABreadcrumb',
  props: { items: Array },
  emits: ['clickItem'],
  template: '<nav data-testid="breadcrumb" />',
}));

vi.mock('antdv-next', () => ({ Breadcrumb: breadcrumbStub }));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/stores/menu', () => ({
  useMenuStore: () => ({ sidebarTree: mocks.sidebarTree }),
}));

describe('AdminBreadcrumb', () => {
  beforeEach(() => {
    mocks.push.mockClear();
  });

  it('按菜单树生成层级，并通过前端路由跳转祖先页面', () => {
    const wrapper = mount(AdminBreadcrumb);
    const breadcrumb = wrapper.getComponent(breadcrumbStub);
    const items = breadcrumb.props('items') as NonNullable<BreadcrumbProps['items']>;

    expect(items.map((item) => item.title)).toEqual([
      '首页',
      '系统管理',
      '用户管理',
    ]);

    breadcrumb.vm.$emit('clickItem', items[0], new MouseEvent('click'));
    expect(mocks.push).toHaveBeenCalledWith('/dashboard');
  });
});
