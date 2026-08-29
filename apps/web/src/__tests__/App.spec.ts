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

    expect(provider.props('theme')).toMatchObject({
      algorithm: themeAlgorithms.light,
      cssVar: { key: 'css-var-nest-admin' },
    });
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(document.documentElement.classList).toContain('css-var-nest-admin');

    settings.setThemeMode('dark');
    await nextTick();

    expect(provider.props('theme')).toMatchObject({ algorithm: themeAlgorithms.dark });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    wrapper.unmount();
    expect(document.documentElement.classList).not.toContain('css-var-nest-admin');
  });
});
