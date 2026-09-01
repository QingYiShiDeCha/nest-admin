import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LayoutSettingsDrawer from '@/layouts/components/LayoutSettingsDrawer.vue';
import { useSettingsStore } from '@/stores/settings';

vi.mock('antdv-next', () => ({
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
    expect(wrapper.findAll('[data-testid="switch"]')).toHaveLength(4);
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
});
