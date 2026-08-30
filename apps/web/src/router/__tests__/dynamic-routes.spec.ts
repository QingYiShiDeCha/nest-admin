import type { MenuNode } from '@nest-admin/shared';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';

import {
  ADMIN_ROUTE_NAME,
  createDynamicRouteManager,
} from '@/router/dynamic-routes';

const EmptyView = defineComponent({ render: () => null });

function menu(
  id: number,
  path: string | null,
  overrides: Partial<MenuNode> = {},
): MenuNode {
  return {
    id,
    parentId: null,
    name: `菜单${id}`,
    type: 'menu',
    path,
    component: null,
    icon: null,
    sort: 0,
    visible: true,
    keepAlive: false,
    status: 'active',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
    children: [],
    ...overrides,
  };
}

function router() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        name: ADMIN_ROUTE_NAME,
        component: EmptyView,
        children: [],
      },
    ],
  });
}

describe('dynamic route manager', () => {
  it('component 留空时按路由 path 匹配 index.vue', () => {
    const target = router();
    const manager = createDynamicRouteManager({
      '../views/dashboard/index.vue': async () => ({ default: EmptyView }),
    });

    manager.sync(target, [
      menu(1, '/dashboard', {
        name: '首页',
        icon: 'RiDashboardLine',
        keepAlive: true,
      }),
    ]);

    expect(target.resolve('/dashboard')).toMatchObject({
      name: 'dynamic-menu-1',
      meta: {
        title: '首页',
        icon: 'RiDashboardLine',
        affix: true,
        keepAlive: true,
        cacheName: 'DashboardPage',
      },
    });
  });

  it.each([
    'system/user/index',
    'system/user/index.vue',
    'views/system/user/index.vue',
    '@/views/system/user/index.vue',
  ])('兼容组件路径格式 %s', (component) => {
    const target = router();
    const manager = createDynamicRouteManager({
      '../views/system/user/index.vue': async () => ({ default: EmptyView }),
    });

    manager.sync(target, [menu(2, '/system/user', { component })]);

    expect(target.hasRoute('dynamic-menu-2')).toBe(true);
  });

  it('跳过目录、外链和无法匹配的页面', () => {
    const target = router();
    const warn = vi.fn();
    const manager = createDynamicRouteManager({}, warn);

    manager.sync(target, [
      menu(1, null, { type: 'directory' }),
      menu(2, 'https://example.com', { type: 'external' }),
      menu(3, '/missing'),
    ]);

    expect(target.getRoutes().filter((route) => route.name?.toString().startsWith('dynamic-menu-'))).toHaveLength(0);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      '菜单「菜单3」无法匹配前端组件：missing/index.vue',
    );
  });

  it('重复同步不重复注册，reset 会移除全部动态路由', () => {
    const target = router();
    const manager = createDynamicRouteManager({
      '../views/profile/index.vue': async () => ({ default: EmptyView }),
    });
    const tree = [menu(4, '/profile')];

    manager.sync(target, tree);
    manager.sync(target, tree);

    expect(
      target
        .getRoutes()
        .filter((route) => route.name === 'dynamic-menu-4'),
    ).toHaveLength(1);

    manager.reset();

    expect(target.hasRoute('dynamic-menu-4')).toBe(false);
  });
});
