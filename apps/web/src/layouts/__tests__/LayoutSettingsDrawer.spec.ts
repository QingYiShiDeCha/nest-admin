import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LayoutSettingsDrawer from '@/layouts/components/LayoutSettingsDrawer.vue';
import { useSettingsStore } from '@/stores/settings';

const mocks = vi.hoisted(() => ({
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
}));

vi.mock('antdv-next', () => ({
  App: {
    useApp: () => ({
      message: {
        error: mocks.messageError,
        success: mocks.messageSuccess,
      },
    }),
  },
  Button: {
    name: 'AButton',
    template: '<button type="button"><slot name="icon" /><slot /></button>',
  },
  Drawer: {
    name: 'ADrawer',
    props: { open: Boolean, size: String, title: String },
    emits: ['update:open'],
    template:
      '<aside v-if="open" data-testid="settings-drawer"><slot /></aside>',
  },
  Segmented: {
    name: 'ASegmented',
    props: { value: String, options: Array },
    emits: ['update:value'],
    template: '<div data-testid="segmented" />',
  },
  InputNumber: {
    name: 'AInputNumber',
    props: { value: Number, min: Number, max: Number, step: Number },
    emits: ['update:value'],
    template: '<div data-testid="input-number" />',
  },
  Select: {
    name: 'ASelect',
    props: { value: String, options: Array },
    emits: ['update:value'],
    template: '<div data-testid="select" />',
  },
  Popconfirm: {
    name: 'APopconfirm',
    emits: ['confirm'],
    template: '<div data-testid="popconfirm"><slot /></div>',
  },
  Switch: {
    name: 'ASwitch',
    props: { checked: Boolean },
    emits: ['update:checked'],
    template: '<button type="button" data-testid="switch" />',
  },
}));

describe('LayoutSettingsDrawer', () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mountDrawer(open = true) {
    return mount(LayoutSettingsDrawer, {
      props: { open },
      global: { plugins: [pinia] },
    });
  }

  it('只渲染由外部 open 状态控制的设置抽屉', async () => {
    const wrapper = mountDrawer(false);

    expect(wrapper.find('[data-testid="settings-drawer"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('button[title="界面设置"]').exists()).toBe(false);

    await wrapper.setProps({ open: true });

    const drawer = wrapper.get('[data-testid="settings-drawer"]');
    expect(wrapper.getComponent({ name: 'ADrawer' }).props('size')).toBe(
      '372px',
    );
    expect(drawer.text()).toContain('主题风格');
    expect(drawer.text()).toContain('主题色');
    expect(drawer.text()).toContain('菜单背景');
    expect(drawer.text()).not.toContain('菜单布局');
    expect(drawer.text()).not.toContain('布局方向');
    expect(drawer.text()).toContain('基础配置');
    expect(drawer.text()).toContain('显示刷新数据按钮');
    expect(drawer.text()).toContain('显示全局面包屑');
    expect(drawer.text()).toContain('布局配置');
    expect(drawer.text()).toContain('菜单宽度');
    expect(drawer.text()).toContain('标签页风格');
    expect(drawer.text()).toContain('页面切换动画');
    expect(drawer.text()).toContain('全局圆角');
    expect(drawer.text()).toContain('显示顶部进度条');
    expect(drawer.text()).toContain('显示全局水印');
    expect(drawer.text()).toContain('移动端表格卡片模式');
    expect(drawer.text()).toContain('显示版权合规信息');
    expect(drawer.text()).toContain('容器宽度');
    expect(drawer.text()).toContain('复制配置');
    expect(drawer.text()).toContain('重置配置');
    expect(wrapper.findAll('[data-testid="switch"]')).toHaveLength(10);
    expect(drawer.get('h3').classes()).toEqual(
      expect.arrayContaining(['text-[15px]', 'font-semibold']),
    );
    expect(drawer.get('h3').classes()).toContain(
      '[color:var(--ant-color-text-heading)]',
    );
    expect(drawer.findAll('section')[3]!.get('span.min-w-0').classes()).toEqual(
      expect.arrayContaining([
        'font-medium',
        '[color:var(--ant-color-text-secondary)]',
      ]),
    );
  });

  it('从抽屉切换全局主题模式', async () => {
    const wrapper = mountDrawer();
    const settings = useSettingsStore(pinia);

    const darkTheme = wrapper.get('button[title="深色主题"]');
    expect(darkTheme.attributes('aria-pressed')).toBe('false');

    await darkTheme.trigger('click');

    expect(darkTheme.attributes('aria-pressed')).toBe('true');
    expect(settings.themeMode).toBe('dark');
    expect(settings.resolvedTheme).toBe('dark');
  });

  it('菜单背景默认浅色，并从抽屉切换为深色', async () => {
    const wrapper = mountDrawer();
    const settings = useSettingsStore(pinia);

    const menuBackground = wrapper.findAllComponents({
      name: 'ASegmented',
    })[0]!;
    expect(menuBackground.props('value')).toBe('light');

    menuBackground.vm.$emit('update:value', 'dark');
    await wrapper.vm.$nextTick();

    expect(settings.menuBackground).toBe('dark');
    expect(menuBackground.props('value')).toBe('dark');
  });

  it('从抽屉切换主题色', async () => {
    const wrapper = mountDrawer();
    const settings = useSettingsStore(pinia);

    const greenTheme = wrapper.get('button[title="绿色主题色"]');
    expect(greenTheme.attributes('aria-pressed')).toBe('false');

    await greenTheme.trigger('click');

    expect(greenTheme.attributes('aria-pressed')).toBe('true');
    expect(settings.primaryColor).toBe('#60C041');
  });

  it('基础配置开关直接更新设置 Store', async () => {
    const wrapper = mountDrawer();
    const settings = useSettingsStore(pinia);
    const switches = wrapper.findAllComponents({ name: 'ASwitch' });

    switches[0]!.vm.$emit('update:checked', false);
    switches[1]!.vm.$emit('update:checked', true);
    switches[3]!.vm.$emit('update:checked', true);
    await wrapper.vm.$nextTick();

    expect(settings.showTabs).toBe(false);
    expect(settings.sidebarAccordion).toBe(true);
    expect(settings.showQuickEntry).toBe(true);
  });

  it('更新菜单宽度、标签风格、页面动画和全局圆角', async () => {
    const wrapper = mountDrawer();
    const settings = useSettingsStore(pinia);
    const numberInputs = wrapper.findAllComponents({ name: 'AInputNumber' });
    const selects = wrapper.findAllComponents({ name: 'ASelect' });

    numberInputs[0]!.vm.$emit('update:value', 250);
    selects[0]!.vm.$emit('update:value', 'fixed');
    selects[1]!.vm.$emit('update:value', 'pill');
    selects[2]!.vm.$emit('update:value', 'fade');
    numberInputs[1]!.vm.$emit('update:value', 10);
    await wrapper.vm.$nextTick();

    expect(settings.menuWidth).toBe(250);
    expect(settings.containerWidth).toBe('fixed');
    expect(settings.tabStyle).toBe('pill');
    expect(settings.pageTransition).toBe('fade');
    expect(settings.borderRadius).toBe(10);
  });

  it('复制完整配置并确认恢复默认设置', async () => {
    const writeText = vi.fn(async (text: string) => {
      void text;
    });
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = mountDrawer();
    const settings = useSettingsStore(pinia);
    settings.setContainerWidth('fixed');
    settings.setBooleanLayoutSetting('showWatermark', true);

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('复制配置'))!
      .trigger('click');

    expect(writeText).toHaveBeenCalledOnce();
    expect(JSON.parse(writeText.mock.calls[0]![0])).toMatchObject({
      version: 1,
      settings: { containerWidth: 'fixed', showWatermark: true },
    });
    expect(mocks.messageSuccess).toHaveBeenCalledWith('界面配置已复制');

    wrapper.getComponent({ name: 'APopconfirm' }).vm.$emit('confirm');
    await wrapper.vm.$nextTick();

    expect(settings.containerWidth).toBe('full');
    expect(settings.showWatermark).toBe(false);
    expect(mocks.messageSuccess).toHaveBeenCalledWith('界面配置已恢复默认');
  });
});
