import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from './index.vue';

const mocks = vi.hoisted(() => ({
  refresh: undefined as (() => Promise<void> | void) | undefined,
}));

vi.mock('@/composables/use-page-refresh', () => ({
  usePageRefresh(handler: () => Promise<void> | void) {
    mocks.refresh = handler;
  },
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ primaryColor: '#5D87FF' }),
}));

vi.mock('@/components/core/charts', () => ({
  BarChart: { name: 'BarChart', template: '<div />' },
  HeatmapChart: { name: 'HeatmapChart', template: '<div />' },
  PieChart: { name: 'PieChart', template: '<div />' },
}));

vi.mock('antdv-next', () => {
  const stub = (name: string) => ({
    name,
    template: '<div><slot /><slot name="extra" /></div>',
  });

  return {
    Avatar: stub('AAvatar'),
    Button: stub('AButton'),
    Card: stub('ACard'),
    Space: stub('ASpace'),
    Statistic: {
      name: 'AStatistic',
      props: {
        classes: Object,
        formatter: Function,
        precision: Number,
        suffix: String,
        value: Number,
      },
      template: '<div>{{ value }}</div>',
    },
    Tag: stub('ATag'),
  };
});

describe('DashboardPage refresh', () => {
  beforeEach(() => {
    mocks.refresh = undefined;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        queueMicrotask(() => callback(performance.now() + 1_000));
        return 1;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Header 刷新时重建图表以重播入场动画', async () => {
    const wrapper = mount(DashboardPage);
    const pageElement = wrapper.element;
    const chartKeys = () => [
      wrapper.getComponent({ name: 'PieChart' }).vm.$.vnode.key,
      wrapper.getComponent({ name: 'BarChart' }).vm.$.vnode.key,
      wrapper.getComponent({ name: 'HeatmapChart' }).vm.$.vnode.key,
    ];

    expect(chartKeys()).toEqual(['device-0', 'audience-0', 'activity-0']);
    await flushPromises();

    const statistics = wrapper.findAllComponents({ name: 'AStatistic' });
    expect(statistics.map((item) => item.props('value'))).toEqual([
      48_260, 156, 38.2, 252,
    ]);
    expect(statistics[1]!.props('suffix')).toBe('K');
    expect(statistics[2]!.props('suffix')).toBe('%');
    expect(statistics[3]!.props('formatter')(252)).toBe('4分12秒');

    await mocks.refresh?.();
    await flushPromises();
    await nextTick();

    expect(wrapper.element).toBe(pageElement);
    expect(chartKeys()).toEqual(['device-1', 'audience-1', 'activity-1']);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });
});
