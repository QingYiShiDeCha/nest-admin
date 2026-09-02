import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePageRefresh } from '@/composables/use-page-refresh';
import AdminLayout from '@/layouts/AdminLayout.vue';

const mocks = vi.hoisted(() => ({
  go: vi.fn(),
  pageMounts: 0,
  push: vi.fn(),
  setThemeMode: vi.fn(),
  route: {
    fullPath: '/dashboard',
    meta: { cacheName: 'DashboardPage', title: '首页' },
    path: '/dashboard',
  },
  pageTransition: 'slide-up',
  showBreadcrumb: true,
  showQuickEntry: false,
  showRefreshButton: true,
  showSidebarCollapseButton: true,
  showTabs: true,
  showCopyright: false,
  showWatermark: false,
  containerWidth: 'full',
}));

vi.mock('vue-router', () => ({
  RouterView: {
    name: 'RouterView',
    template: '<div data-testid="router-view" />',
  },
  useRoute: () => mocks.route,
  useRouter: () => ({ go: mocks.go, push: mocks.push }),
}));

vi.mock('antdv-next', () => {
  const stub = (name: string, testId: string) => ({
    name,
    inheritAttrs: false,
    template: `<div data-testid="${testId}" v-bind="$attrs"><slot /><slot name="content" /></div>`,
  });

  return {
    App: {
      useApp: () => ({
        message: { error: vi.fn(), success: vi.fn() },
      }),
    },
    Badge: stub('ABadge', 'badge'),
    Button: stub('AButton', 'button'),
    Breadcrumb: stub('ABreadcrumb', 'breadcrumb'),
    Avatar: stub('AAvatar', 'avatar'),
    Dropdown: stub('ADropdown', 'dropdown'),
    Drawer: stub('ADrawer', 'drawer'),
    InputNumber: stub('AInputNumber', 'input-number'),
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
    Popconfirm: stub('APopconfirm', 'popconfirm'),
    Segmented: stub('ASegmented', 'segmented'),
    Select: stub('ASelect', 'select'),
    Switch: stub('ASwitch', 'switch'),
    Tag: stub('ATag', 'tag'),
    Watermark: {
      name: 'AWatermark',
      inheritAttrs: false,
      props: { content: Array, font: Object },
      template: '<div data-testid="watermark" v-bind="$attrs"><slot /></div>',
    },
    theme: {
      useToken: () => ({
        token: {
          value: { colorBgContainer: '#ffffff', colorBgLayout: '#f5f5f5' },
        },
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

vi.mock('@/layouts/components/notification-popover/index.vue', () => ({
  default: {
    name: 'NotificationPopover',
    template:
      '<div data-testid="notification-popover"><slot name="trigger" :unread-count="1" /></div>',
  },
}));

vi.mock('@/layouts/components/quick-entry-popover/index.vue', () => ({
  default: {
    name: 'QuickEntryPopover',
    template:
      '<div data-testid="quick-entry-popover"><slot name="trigger" /></div>',
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
  BORDER_RADIUS_MAX: 16,
  BORDER_RADIUS_MIN: 0,
  MENU_WIDTH_MAX: 280,
  MENU_WIDTH_MIN: 180,
  useSettingsStore: () => ({
    borderRadius: 6,
    containerWidth: mocks.containerWidth,
    menuBackground: 'light',
    menuWidth: 220,
    pageTransition: mocks.pageTransition,
    primaryColor: '#1677ff',
    showBreadcrumb: mocks.showBreadcrumb,
    showCopyright: mocks.showCopyright,
    showQuickEntry: mocks.showQuickEntry,
    showRefreshButton: mocks.showRefreshButton,
    showSidebarCollapseButton: mocks.showSidebarCollapseButton,
    showTabs: mocks.showTabs,
    showTopProgress: true,
    showWatermark: mocks.showWatermark,
    mobileTableCardMode: true,
    sidebarAccordion: false,
    tabStyle: 'card',
    themeMode: 'light',
    resolvedTheme: 'light',
    setPrimaryColor: vi.fn(),
    setMenuBackground: vi.fn(),
    setThemeMode: mocks.setThemeMode,
  }),
}));

vi.mock('@/stores/system-config', () => ({
  useSystemConfigStore: () => ({ systemName: 'Nest Admin' }),
}));

vi.mock('@/stores/tabs', () => ({
  useTabsStore: () => ({ cachedNames: ['DashboardPage'], reset: vi.fn() }),
}));

describe('AdminLayout scroll ownership', () => {
  beforeEach(() => {
    mocks.pageTransition = 'slide-up';
    mocks.showBreadcrumb = true;
    mocks.showQuickEntry = false;
    mocks.showRefreshButton = true;
    mocks.showSidebarCollapseButton = true;
    mocks.showTabs = true;
    mocks.showCopyright = false;
    mocks.showWatermark = false;
    mocks.containerWidth = 'full';
  });

  it('所有登录用户都显示个人消息通知入口', () => {
    const wrapper = mount(AdminLayout);
    const notificationTrigger = wrapper.get('button[title="消息通知"]');
    const settingsTrigger = wrapper.get('button[title="界面设置"]');

    expect(wrapper.find('[data-testid="notification-popover"]').exists()).toBe(
      true,
    );
    expect(notificationTrigger.classes()).toContain('notification-trigger');
    expect(notificationTrigger.get('i').classes()).toContain(
      'i-ri:notification-3-line',
    );
    expect(settingsTrigger.classes()).toContain('layout-settings-trigger');
    expect(settingsTrigger.get('i').classes()).toContain('i-ri:settings-line');
  });

  it('在铃铛旁快捷切换浅色和深色主题', async () => {
    mocks.setThemeMode.mockClear();
    const wrapper = mount(AdminLayout);
    const themeTrigger = wrapper.get('button[title="切换深色主题"]');

    expect(themeTrigger.classes()).toContain('theme-toggle-trigger');
    expect(themeTrigger.get('i').classes()).toContain('i-ri:moon-line');

    await themeTrigger.trigger('click');
    expect(mocks.setThemeMode).toHaveBeenCalledWith('dark');
  });

  it('从 Header 控制侧栏收起和展开', async () => {
    const wrapper = mount(AdminLayout);
    const sider = wrapper.getComponent({ name: 'ALayoutSider' });

    expect(sider.props('collapsed')).toBe(false);
    expect(sider.props('trigger')).toBeNull();
    expect(wrapper.text()).toContain('Nest Admin');
    expect(wrapper.get('[data-testid="menu"]').attributes('theme')).toBe(
      'light',
    );

    await wrapper.get('button[title="收起菜单"]').trigger('click');

    expect(sider.props('collapsed')).toBe(true);
    expect(wrapper.find('button[title="展开菜单"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Nest Admin');
    expect(wrapper.find('img[alt="Nest Admin"]').exists()).toBe(true);
    expect(wrapper.get('button[title="展开菜单"]').classes()).toContain(
      '-ml-2',
    );
  });

  it('刷新按钮重载当前页面数据且不重新挂载页面', async () => {
    mocks.pageMounts = 0;
    const reload = vi.fn(async () => true);
    const PageComponent = defineComponent({
      name: 'DashboardPage',
      setup: () => {
        mocks.pageMounts += 1;
        usePageRefresh(reload);
        return () => h('div', { 'data-testid': 'page' }, '页面内容');
      },
    });
    const wrapper = mount(AdminLayout, {
      global: {
        stubs: {
          RouterView: {
            setup: () => ({ PageComponent }),
            template: '<slot :Component="PageComponent" />',
          },
        },
      },
    });
    const refreshButton = wrapper.get('button[title="刷新"]');
    const siderElement = wrapper.get('[data-testid="sider"]').element;
    const headerElement = wrapper.get('[data-testid="header"]').element;
    const pageElement = wrapper.get('[data-testid="page"]').element;

    expect(refreshButton.classes()).toContain('header-refresh-trigger');
    expect(refreshButton.find('i').classes()).toContain('i-ri:refresh-line');
    expect(refreshButton.find('i').classes()).toContain('header-refresh-icon');
    expect(mocks.pageMounts).toBe(1);
    await refreshButton.trigger('click');
    await flushPromises();

    expect(mocks.go).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
    expect(mocks.pageMounts).toBe(1);
    expect(wrapper.get('[data-testid="page"]').element).toBe(pageElement);
    expect(wrapper.get('[data-testid="sider"]').element).toBe(siderElement);
    expect(wrapper.get('[data-testid="header"]').element).toBe(headerElement);
  });

  it('让右侧整栏滚动，并将 Header 与 TabBar 固定在顶部', () => {
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
      expect.arrayContaining(['min-h-0', 'overflow-y-auto']),
    );
    expect(wrapper.get('[data-testid="header"]').classes()).toEqual(
      expect.arrayContaining([
        'admin-header',
        'sticky',
        'top-0',
        '!h-13',
        '!leading-13',
        'px-[15px]',
        'md:px-5',
        'shrink-0',
      ]),
    );
    expect(wrapper.find('[data-testid="breadcrumb"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="tab-bar"]').classes()).toEqual(
      expect.arrayContaining(['sticky', 'top-13', 'shrink-0', 'mb-3']),
    );
    expect(wrapper.get('[data-testid="content"]').classes()).toEqual(
      expect.arrayContaining([
        'px-[15px]',
        'md:px-5',
        'pb-6',
        'flex-1',
        'min-h-0',
      ]),
    );
    expect(wrapper.get('[data-testid="content"]').classes()).not.toContain(
      'pt-6',
    );
    expect(wrapper.get('[data-testid="content"]').classes()).not.toContain(
      'overflow-y-auto',
    );
  });

  it('按设置隐藏标签栏和 Header 功能入口', () => {
    mocks.showBreadcrumb = false;
    mocks.showQuickEntry = true;
    mocks.showRefreshButton = false;
    mocks.showSidebarCollapseButton = false;
    mocks.showTabs = false;
    const wrapper = mount(AdminLayout);

    expect(wrapper.find('[data-testid="tab-bar"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="content"]').classes()).toContain('pt-3');
    expect(wrapper.find('[data-testid="breadcrumb"]').exists()).toBe(false);
    expect(wrapper.find('button[title="刷新"]').exists()).toBe(false);
    expect(wrapper.find('button[title="收起菜单"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="quick-entry-popover"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('button[title="快捷入口"]').exists()).toBe(true);
  });

  it('在内容区应用水印、固定容器和版权信息', () => {
    mocks.containerWidth = 'fixed';
    mocks.showCopyright = true;
    mocks.showWatermark = true;
    const wrapper = mount(AdminLayout);
    const watermark = wrapper.getComponent({ name: 'AWatermark' });
    const content = wrapper.get('[data-testid="content"]');

    expect(watermark.props('content')).toEqual(['Nest Admin', 'admin']);
    expect(watermark.classes()).toEqual(
      expect.arrayContaining(['flex-1', 'min-h-0']),
    );
    expect(content.classes()).toEqual(
      expect.arrayContaining(['w-full', 'max-w-[1440px]', 'mx-auto']),
    );
    expect(wrapper.get('footer').text()).toContain(
      `© ${new Date().getFullYear()} Nest Admin. All rights reserved.`,
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
      css: true,
      mode: 'out-in',
      enterActiveClass: 'transition duration-200 ease-out',
      enterFromClass: 'opacity-0 translate-y-1',
      leaveActiveClass: 'transition duration-150 ease-in',
      leaveToClass: 'opacity-0 -translate-y-1',
    });
  });

  it('支持关闭页面切换动画', () => {
    mocks.pageTransition = 'none';
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

    expect(transition.props('css')).toBe(false);
  });
});
