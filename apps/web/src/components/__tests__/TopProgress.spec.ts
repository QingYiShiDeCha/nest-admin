import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TopProgress from '@/components/core/feedback/top-progress/index.vue';
import {
  finishGlobalProgress,
  resetGlobalProgress,
  startGlobalProgress,
} from '@/composables/use-global-progress';
import { useSettingsStore } from '@/stores/settings';

describe('TopProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetGlobalProgress();
  });

  afterEach(() => {
    resetGlobalProgress();
    vi.useRealTimers();
  });

  it('按设置显示全局任务进度', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const settings = useSettingsStore(pinia);
    const wrapper = mount(TopProgress, { global: { plugins: [pinia] } });
    const task = startGlobalProgress('request');

    vi.advanceTimersByTime(120);
    await wrapper.vm.$nextTick();

    expect(
      wrapper.get('[role="progressbar"]').attributes('aria-valuenow'),
    ).toBe('8');

    settings.setBooleanLayoutSetting('showTopProgress', false);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);

    finishGlobalProgress(task);
  });
});
