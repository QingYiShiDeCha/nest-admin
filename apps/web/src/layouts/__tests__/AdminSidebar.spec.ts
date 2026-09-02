import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MenuNode } from '@nest-admin/shared';
import AdminSidebar from '@/layouts/components/AdminSidebar.vue';
import { useSettingsStore } from '@/stores/settings';

const mocks = vi.hoisted(() => ({
  route: { path: '/dashboard' },
  sidebarTree: [] as unknown[],
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/stores/menu', () => ({
  useMenuStore: () => ({ sidebarTree: mocks.sidebarTree }),
}));

vi.mock('antdv-next', () => ({
  LayoutSider: {
    name: 'ALayoutSider',
    inheritAttrs: false,
    props: { collapsed: Boolean, trigger: null, width: Number },
    template: '<aside data-testid="sider" v-bind="$attrs"><slot /></aside>',
  },
  Menu: {
    name: 'AMenu',
    props: { items: Array, openKeys: Array, theme: String },
    emits: ['openChange', 'click'],
    template: '<nav data-testid="sidebar-menu" :data-theme="theme" />',
  },
  theme: {
    useToken: () => ({ token: { value: { colorBgContainer: '#ffffff' } } }),
  },
}));

describe('AdminSidebar menu background', () => {
  beforeEach(() => {
    mocks.route.path = '/dashboard';
    mocks.sidebarTree = [];
  });

  it('默认使用浅色菜单，并响应深色设置', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const settings = useSettingsStore(pinia);
    const wrapper = mount(AdminSidebar, {
      props: { collapsed: false },
      global: { plugins: [pinia] },
    });
    const menu = wrapper.getComponent({ name: 'AMenu' });
    const title = wrapper.get('span');
    const logoBar = wrapper.get('.h-16');

    expect(menu.props('theme')).toBe('light');
    const siderStyle = wrapper.get('[data-testid="sider"]').attributes('style');
    expect(wrapper.get('[data-testid="sider"]').classes()).toContain(
      'admin-sidebar',
    );
    expect(siderStyle).toContain('background: rgb(255, 255, 255)');
    expect(logoBar.attributes('style')).toContain(
      'background: rgb(255, 255, 255)',
    );
    expect(logoBar.classes()).toEqual(
      expect.arrayContaining([
        'border-r',
        'border-solid',
        'a-border-border-secondary',
      ]),
    );
    expect(title.attributes('style')).toContain('color: rgb(56, 56, 83)');

    settings.setThemeMode('dark');
    await nextTick();

    expect(menu.props('theme')).toBe('light');
    expect(wrapper.get('[data-testid="sider"]').attributes('style')).toContain(
      'background: rgb(22, 22, 24)',
    );
    expect(title.attributes('style')).toContain('color: rgb(221, 221, 221)');

    settings.setMenuBackground('dark');
    await nextTick();

    expect(menu.props('theme')).toBe('dark');
    expect(wrapper.get('[data-testid="sider"]').attributes('style')).toContain(
      'background: rgb(25, 26, 35)',
    );
    expect(title.attributes('style')).toContain('color: rgb(217, 218, 219)');
  });

  it('响应菜单宽度设置，并在手风琴模式下只展开一个根菜单', async () => {
    const createNode = (
      id: number,
      name: string,
      path: string | null,
      children: MenuNode[] = [],
    ): MenuNode => ({
      id,
      parentId: null,
      name,
      type: path ? 'menu' : 'directory',
      path,
      component: path ? 'system/example/index' : null,
      icon: null,
      sort: id,
      visible: true,
      keepAlive: false,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      children,
    });
    const firstChild = createNode(2, '用户管理', '/system/user');
    const secondChild = createNode(4, '日志管理', '/system/log');
    mocks.route.path = '/system/user';
    mocks.sidebarTree = [
      createNode(1, '系统管理', null, [firstChild]),
      createNode(3, '系统监控', null, [secondChild]),
    ];
    const pinia = createPinia();
    setActivePinia(pinia);
    const settings = useSettingsStore(pinia);
    settings.setMenuWidth(250);
    settings.setBooleanLayoutSetting('sidebarAccordion', true);
    const wrapper = mount(AdminSidebar, {
      props: { collapsed: false },
      global: { plugins: [pinia] },
    });
    const sider = wrapper.getComponent({ name: 'ALayoutSider' });
    const menu = wrapper.getComponent({ name: 'AMenu' });

    expect(sider.props('width')).toBe(250);
    expect(menu.props('openKeys')).toEqual(['menu-1']);

    menu.vm.$emit('openChange', ['menu-1', 'menu-3']);
    await nextTick();

    expect(menu.props('openKeys')).toEqual(['menu-3']);
  });
});
