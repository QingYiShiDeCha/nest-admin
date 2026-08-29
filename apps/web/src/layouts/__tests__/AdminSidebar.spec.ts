import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import AdminSidebar from '@/layouts/components/AdminSidebar.vue';
import { useSettingsStore } from '@/stores/settings';

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/dashboard' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/stores/menu', () => ({
  useMenuStore: () => ({ sidebarTree: [] }),
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
    props: { theme: String },
    template: '<nav data-testid="sidebar-menu" :data-theme="theme" />',
  },
  theme: {
    useToken: () => ({ token: { value: { colorBgContainer: '#ffffff' } } }),
  },
}));

describe('AdminSidebar menu background', () => {
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
});
