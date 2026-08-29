import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AdminLayout from '@/layouts/AdminLayout.vue';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  route: {
    fullPath: '/dashboard',
    meta: { title: '首页' },
    path: '/dashboard',
  },
}));

vi.mock('vue-router', () => ({
  RouterView: {
    name: 'RouterView',
    template: '<div data-testid="router-view" />',
  },
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('antdv-next', () => {
  const stub = (name: string, testId: string) => ({
    name,
    inheritAttrs: false,
    template: `<div data-testid="${testId}" v-bind="$attrs"><slot /><slot name="content" /></div>`,
  });

  return {
    Breadcrumb: stub('ABreadcrumb', 'breadcrumb'),
    Dropdown: stub('ADropdown', 'dropdown'),
    Drawer: stub('ADrawer', 'drawer'),
    Layout: stub('ALayout', 'layout'),
    LayoutContent: stub('ALayoutContent', 'content'),
    LayoutHeader: stub('ALayoutHeader', 'header'),
    LayoutSider: {
      name: 'ALayoutSider',
      inheritAttrs: false,
      props: {
        collapsed: Boolean,
        trigger: { default: undefined },
        width: [Number, String],
      },
      template: '<div data-testid="sider" v-bind="$attrs"><slot /></div>',
    },
    Menu: stub('AMenu', 'menu'),
    Popover: stub('APopover', 'popover'),
    Segmented: stub('ASegmented', 'segmented'),
    Switch: stub('ASwitch', 'switch'),
    Tag: stub('ATag', 'tag'),
    theme: {
      useToken: () => ({
        token: { value: { colorBgContainer: '#ffffff', colorBgLayout: '#f5f5f5' } },
      }),
    },
  };
});

vi.mock('@/layouts/components/TabBar.vue', () => ({
  default: {
    name: 'TabBar',
    inheritAttrs: false,
    template: '<div data-testid="tab-bar" v-bind="$attrs" />',
  },
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    isSuperAdmin: false,
    logout: vi.fn(),
    profile: null,
    username: 'admin',
  }),
}));

vi.mock('@/stores/menu', () => ({
  useMenuStore: () => ({ reset: vi.fn(), sidebarTree: [] }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    menuBackground: 'light',
    primaryColor: '#1677ff',
    themeMode: 'light',
    resolvedTheme: 'light',
    setPrimaryColor: vi.fn(),
    setMenuBackground: vi.fn(),
    setThemeMode: vi.fn(),
  }),
}));

vi.mock('@/stores/tabs', () => ({
  useTabsStore: () => ({ cachedNames: [], reset: vi.fn() }),
}));

describe('AdminLayout scroll ownership', () => {
  it('从 Header 控制侧栏收起和展开', async () => {
    const wrapper = mount(AdminLayout);
    const sider = wrapper.getComponent({ name: 'ALayoutSider' });

    expect(sider.props('collapsed')).toBe(false);
    expect(sider.props('trigger')).toBeNull();
    expect(wrapper.text()).toContain('Nest Admin');
    expect(wrapper.get('[data-testid="menu"]').attributes('theme')).toBe('light');

    await wrapper.get('button[title="收起菜单"]').trigger('click');

    expect(sider.props('collapsed')).toBe(true);
    expect(wrapper.find('button[title="展开菜单"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Nest Admin');
    expect(wrapper.find('img[alt="nest-admin"]').exists()).toBe(true);
  });

  it('锁定根布局，并只允许内容区纵向滚动', () => {
    const wrapper = mount(AdminLayout, {
      global: {
        stubs: {
          RouterView: {
            template:
              '<div data-testid="router-view"><slot :Component="null" /></div>',
          },
        },
      },
    });
    const layouts = wrapper.findAll('[data-testid="layout"]');

    expect(layouts).toHaveLength(2);
    expect(layouts[0]!.classes()).toEqual(
      expect.arrayContaining(['h-screen', 'overflow-hidden']),
    );
    expect(layouts[1]!.classes()).toEqual(
      expect.arrayContaining(['min-h-0', 'overflow-hidden']),
    );
    expect(wrapper.get('[data-testid="header"]').classes()).toContain('shrink-0');
    expect(wrapper.find('[data-testid="breadcrumb"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="tab-bar"]').classes()).toContain('shrink-0');
    expect(wrapper.get('[data-testid="content"]').classes()).toEqual(
      expect.arrayContaining(['flex-1', 'min-h-0', 'overflow-y-auto']),
    );
  });

  it('用轻量过渡动画切换缓存页面', () => {
    const wrapper = mount(AdminLayout, {
      global: {
        stubs: {
          RouterView: {
            template:
              '<div data-testid="router-view"><slot :Component="null" /></div>',
          },
        },
      },
    });
    const transition = wrapper.getComponent({ name: 'Transition' });

    expect(transition.props()).toMatchObject({
      mode: 'out-in',
      enterActiveClass: 'transition duration-200 ease-out',
      enterFromClass: 'opacity-0 translate-y-1',
      leaveActiveClass: 'transition duration-150 ease-in',
      leaveToClass: 'opacity-0 -translate-y-1',
    });
  });
});
