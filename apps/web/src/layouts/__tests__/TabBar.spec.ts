import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import TabBar from '@/layouts/components/TabBar.vue';
import { useSettingsStore } from '@/stores/settings';
import { useTabsStore } from '@/stores/tabs';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  route: { fullPath: '/dashboard' },
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('antdv-next', () => ({
  Dropdown: {
    name: 'ADropdown',
    template: '<div><slot /></div>',
  },
}));

describe('TabBar style', () => {
  it('响应卡片、简约和圆角标签风格', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const tabs = useTabsStore(pinia);
    const settings = useSettingsStore(pinia);
    tabs.visit({
      fullPath: '/dashboard',
      meta: { title: '首页', affix: true },
    });
    tabs.visit({
      fullPath: '/system/user',
      meta: { title: '用户管理' },
    });
    const wrapper = mount(TabBar, { global: { plugins: [pinia] } });
    const activeTab = () =>
      wrapper
        .findAll('button')
        .find((button) => button.text().includes('首页'))!;

    expect(activeTab().classes()).toEqual(
      expect.arrayContaining(['border-primary', 'rounded', 'a-bg-primary-bg']),
    );

    settings.setTabStyle('line');
    await nextTick();

    expect(activeTab().classes()).toEqual(
      expect.arrayContaining(['border-b-2', 'rounded-none', 'bg-transparent']),
    );

    settings.setTabStyle('pill');
    await nextTick();

    expect(activeTab().classes()).toEqual(
      expect.arrayContaining(['border-primary', 'rounded-full']),
    );
  });
});
