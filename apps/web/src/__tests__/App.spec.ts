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
    props: { locale: Object, notification: Object, theme: Object },
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
        borderRadius: 6,
        borderRadiusLG: 8,
        colorLink: '#5D87FF',
        colorBgLayout: '#FAFBFC',
        colorBgContainer: '#FFFFFF',
        colorFillSecondary: '#EDEFF0',
        colorFillTertiary: '#F2F4F5',
        colorFillQuaternary: '#F9FAFB',
        colorText: 'color-mix(in srgb, #323251 62%, #ffffff)',
        colorTextSecondary: '#4D5875',
        colorBorder: '#E2E8EE',
        colorBorderSecondary: 'rgba(0, 0, 0, 0.08)',
        colorSplit: '#EDEEF0',
        controlItemBgHover: '#EDEFF0',
        controlItemBgActive: '#F2F4F5',
      },
      components: {
        Button: {
          fontWeight: 500,
          primaryShadow: 'none',
          defaultHoverBg: '#EDEFF0',
          defaultActiveBg: '#F2F4F5',
        },
        Input: {
          addonBg: '#F9FAFB',
          activeBorderColor: '#5D87FF',
          activeShadow:
            '0 0 0 2px color-mix(in srgb, #5D87FF 18%, transparent)',
        },
        Select: {
          optionSelectedColor: '#5D87FF',
          optionSelectedBg: '#F2F4F5',
          optionActiveBg: '#EDEFF0',
        },
        Modal: {
          headerBg: '#FFFFFF',
          contentBg: '#FFFFFF',
          footerBg: '#FFFFFF',
          titleColor: '#323251',
        },
        Notification: {
          progressBg: '#5D87FF',
          colorSuccessBg: 'color-mix(in srgb, #13DEB9 12%, #FFFFFF)',
          colorErrorBg: 'color-mix(in srgb, #FF4D4F 10%, #FFFFFF)',
        },
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
        Card: {
          headerBg: '#FFFFFF',
          colorBorderSecondary: 'rgba(0, 0, 0, 0.08)',
        },
        Table: {
          headerBg: '#F9FAFB',
          rowHoverBg: '#EDEFF0',
          borderColor: '#E2E8EE',
        },
      },
    });
    expect(provider.props('locale')).toEqual({ locale: 'zh-cn' });
    expect(provider.props('notification')).toEqual({
      classes: {
        root: 'border border-solid a-border-border',
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

    settings.setBorderRadius(10);
    await nextTick();

    expect(provider.props('theme')).toMatchObject({
      token: {
        borderRadius: 10,
        borderRadiusLG: 12,
        borderRadiusSM: 8,
        borderRadiusXS: 6,
      },
      components: {
        Button: { borderRadius: 10 },
        Input: { borderRadius: 10 },
        Select: { borderRadius: 10 },
        Modal: { borderRadiusLG: 12 },
        Notification: { borderRadiusLG: 12 },
        Card: { borderRadiusLG: 12 },
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
        Button: {
          defaultHoverBg: '#252530',
          defaultActiveBg: '#202226',
        },
        Input: {
          addonBg: '#110F0F',
          activeBorderColor: '#B48DF3',
        },
        Select: {
          optionSelectedColor: '#B48DF3',
          optionSelectedBg: '#202226',
          optionActiveBg: '#252530',
        },
        Modal: {
          headerBg: '#161618',
          contentBg: '#161618',
          footerBg: '#161618',
          titleColor: '#E3E3E8',
        },
        Notification: {
          progressBg: '#B48DF3',
          colorSuccessBg: 'color-mix(in srgb, #13DEB9 18%, #161618)',
          colorErrorBg: 'color-mix(in srgb, #FF4D4F 18%, #161618)',
        },
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
        Card: {
          headerBg: '#161618',
          colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
        },
        Table: {
          headerBg: '#110F0F',
          rowHoverBg: '#252530',
          borderColor: 'rgba(255, 255, 255, 0.1)',
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
