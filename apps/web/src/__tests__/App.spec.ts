import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import App from '@/App.vue';
import { useSettingsStore } from '@/stores/settings';

const themeAlgorithms = vi.hoisted(() => ({
  dark: { name: 'dark' },
  light: { name: 'light' },
}));

vi.mock('antdv-next', () => ({
  App: {
    name: 'AApp',
    template: '<div><slot /></div>',
  },
  ConfigProvider: {
    name: 'AConfigProvider',
    props: { locale: Object, theme: Object },
    template: '<div><slot /></div>',
  },
  theme: {
    darkAlgorithm: themeAlgorithms.dark,
    defaultAlgorithm: themeAlgorithms.light,
  },
}));

vi.mock('antdv-next/locale/zh_CN', () => ({ default: { locale: 'zh-cn' } }));

vi.mock('vue-router', () => ({
  RouterView: {
    name: 'RouterView',
    template: '<main />',
  },
}));

describe('App theme provider', () => {
  it('切换主题算法，并同步根节点主题标记', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const settings = useSettingsStore(pinia);
    const wrapper = mount(App, { global: { plugins: [pinia] } });
    const provider = wrapper.getComponent({ name: 'AConfigProvider' });

    expect(wrapper.findComponent({ name: 'AApp' }).exists()).toBe(true);

    expect(provider.props('theme')).toMatchObject({
      algorithm: themeAlgorithms.light,
      cssVar: { key: 'css-var-nest-admin' },
      token: {
        fontSize: 15,
        controlHeight: 34,
        colorLink: '#5D87FF',
        colorBgLayout: '#FAFBFC',
        colorBgContainer: '#FFFFFF',
        colorFillSecondary: '#EDEFF0',
        colorFillTertiary: '#F2F4F5',
        colorFillQuaternary: '#F9FAFB',
        colorText: '#323251',
        colorTextSecondary: '#4D5875',
        colorBorder: '#E2E8EE',
        colorBorderSecondary: 'rgba(0, 0, 0, 0.08)',
        colorSplit: '#EDEEF0',
        controlItemBgHover: '#EDEFF0',
        controlItemBgActive: '#F2F4F5',
      },
      components: {
        Message: {
          contentBg: '#FFFFFF',
        },
        Tag: {
          defaultBg: '#F9FAFB',
          defaultColor: '#4D5875',
        },
        Menu: {
          itemHeight: 44,
          iconSize: 18,
          collapsedIconSize: 20,
          itemBg: '#FFFFFF',
          itemColor: '#29343D',
          itemHoverBg: '#EDEFF0',
          itemSelectedBg: '#F2F4F5',
        },
      },
    });
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(document.documentElement.classList).toContain('css-var-nest-admin');

    settings.setPrimaryColor('#B48DF3');
    await nextTick();

    expect(provider.props('theme')).toMatchObject({
      token: {
        colorPrimary: '#B48DF3',
        colorLink: '#B48DF3',
      },
      components: {
        Menu: {
          itemSelectedColor: '#B48DF3',
        },
      },
    });

    settings.setThemeMode('dark');
    await nextTick();

    expect(provider.props('theme')).toMatchObject({
      algorithm: themeAlgorithms.dark,
      token: {
        colorBgBase: '#000000',
        colorBgLayout: '#070707',
        colorBgContainer: '#161618',
        colorFillSecondary: '#252530',
        colorFillTertiary: '#17171C',
        colorFillQuaternary: '#110F0F',
        colorBgTextActive: '#202226',
        colorText: '#E3E3E8',
        colorTextSecondary: '#ABABBA',
        colorBorder: 'rgba(255, 255, 255, 0.1)',
        colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
        controlItemBgActive: '#2E2E38',
      },
      components: {
        Message: {
          contentBg: '#161618',
        },
        Tag: {
          defaultBg: '#17171C',
          defaultColor: '#C7C7D1',
        },
        Menu: {
          itemBg: '#161618',
          itemColor: 'rgba(255, 255, 255, 0.7)',
          itemHoverBg: '#252530',
          itemSelectedBg: '#2E2E38',
          darkItemBg: '#191A23',
          darkItemColor: '#BABBBD',
        },
      },
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    wrapper.unmount();
    expect(document.documentElement.classList).not.toContain(
      'css-var-nest-admin',
    );
  });
});
