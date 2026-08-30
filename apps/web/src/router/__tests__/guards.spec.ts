import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setupGuards } from '@/router/guards';

const mocks = vi.hoisted(() => ({
  auth: {
    profile: { id: 1 },
    hasPermission: vi.fn(() => true),
    loadProfile: vi.fn(),
    reset: vi.fn(),
  },
  menu: {
    loaded: false,
    tree: [] as unknown[],
    load: vi.fn(),
    reset: vi.fn(),
  },
  resetDynamicRoutes: vi.fn(),
  syncDynamicRoutes: vi.fn(),
  tabsReset: vi.fn(),
}));

vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('@/stores/menu', () => ({ useMenuStore: () => mocks.menu }));
vi.mock('@/stores/tabs', () => ({
  useTabsStore: () => ({ reset: mocks.tabsReset }),
}));
vi.mock('@/utils/auth-token', () => ({ getAccessToken: () => 'token' }));
vi.mock('@/router/dynamic-routes', () => ({
  resetDynamicRoutes: mocks.resetDynamicRoutes,
  syncDynamicRoutes: mocks.syncDynamicRoutes,
}));

const EmptyView = defineComponent({ render: () => null });

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/login',
        name: 'login',
        component: EmptyView,
        meta: { title: '登录', public: true },
      },
      {
        path: '/',
        name: 'admin-root',
        component: EmptyView,
        children: [],
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: EmptyView,
        meta: { title: '页面不存在' },
      },
    ],
  });
}

describe('router guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.profile = { id: 1 };
    mocks.menu.loaded = false;
    mocks.menu.tree = [];
    mocks.menu.load.mockImplementation(async () => {
      mocks.menu.loaded = true;
      return mocks.menu.tree;
    });
  });

  it('profile 已加载但菜单未加载时仍注册路由并重新匹配原地址', async () => {
    const router = createTestRouter();

    mocks.syncDynamicRoutes.mockImplementation((target: Router) => {
      if (!target.hasRoute('dynamic-menu-1')) {
        target.addRoute('admin-root', {
          path: '/dashboard',
          name: 'dynamic-menu-1',
          component: EmptyView,
          meta: { title: '首页' },
        });
      }
    });
    setupGuards(router);

    await router.push('/dashboard');

    expect(mocks.auth.loadProfile).not.toHaveBeenCalled();
    expect(mocks.menu.load).toHaveBeenCalledOnce();
    expect(mocks.syncDynamicRoutes).toHaveBeenCalled();
    expect(router.currentRoute.value.name).toBe('dynamic-menu-1');
  });
});
