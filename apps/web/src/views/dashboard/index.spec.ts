import type { DashboardStatistics } from '@nest-admin/shared';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from './index.vue';

const mocks = vi.hoisted(() => ({
  refresh: undefined as (() => Promise<void> | void) | undefined,
  fetchStats: vi.fn(),
}));

vi.mock('@/api/statistics', () => ({ apiDashboardStatistics: mocks.fetchStats }));

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
    Empty: stub('AEmpty'),
    Space: stub('ASpace'),
    Spin: {
      name: 'ASpin',
      props: { spinning: Boolean, size: String },
      template: '<div><slot /></div>',
    },
    Statistic: {
      name: 'AStatistic',
      props: {
        classes: Object,
        precision: Number,
        value: Number,
      },
      template: '<div>{{ value }}</div>',
    },
    Tag: stub('ATag'),
  };
});

function sample(): DashboardStatistics {
  return {
    generatedAt: '2026-05-13T04:00:00.000Z',
    summary: {
      totalUsers: { value: 128, trend: { percent: 12, up: true } },
      todayLogins: { value: 44, trend: { percent: 30, up: true } },
      weekLogins: { value: 300, trend: { percent: 4, up: false } },
      recentFailures: { value: 3, trend: null },
    },
    devices: { total: 300, mobile: 100, tablet: 50, desktop: 150 },
    monthlyTrend: {
      months: Array.from({ length: 12 }, (_, i) => ({
        key: `2026-${String(i + 1).padStart(2, '0')}`,
        label: `${i + 1}月`,
        value: i,
      })),
    },
    activityHeatmap: {
      since: '2026-05-07T00:00:00.000Z',
      weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      hourBuckets: Array.from({ length: 24 }, (_, i) => [i, i + 1] as [number, number]),
      cells: Array.from({ length: 7 * 24 }, () => 0),
      max: 100,
    },
    browsers: {
      total: 300,
      items: [
        { name: '谷歌浏览器', value: 200 },
        { name: '微软浏览器', value: 60 },
        { name: '其他浏览器', value: 40 },
      ],
    },
    deptDistribution: {
      totalUsers: 128,
      items: [
        { name: '技术部', value: 80 },
        { name: '未分配部门', value: 48 },
      ],
    },
    topModules: {
      since: '2026-04-13T00:00:00.000Z',
      items: [
        {
          module: '用户管理',
          count: 45,
          failures: 2,
          avgDurationSeconds: 0.32,
        },
        {
          module: '角色权限',
          count: 20,
          failures: 0,
          avgDurationSeconds: 0.55,
        },
      ],
    },
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mocks.refresh = undefined;
    mocks.fetchStats.mockReset();
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

  it('首帧渲染 0，接口到位后再回填并把图表 key 推进', async () => {
    mocks.fetchStats.mockResolvedValue(sample());
    const wrapper = mount(DashboardPage);

    // 空卡先以 0 出现
    const initial = wrapper.findAllComponents({ name: 'AStatistic' });
    expect(initial.map((item) => item.props('value'))).toEqual([0, 0, 0, 0]);

    await flushPromises();
    await nextTick();

    // 数值动效结束后回填真实值
    const loaded = wrapper.findAllComponents({ name: 'AStatistic' });
    expect(loaded.map((item) => item.props('value'))).toEqual([128, 44, 300, 3]);

    // 三张 chart 的 key 都被推进过一次
    expect(wrapper.getComponent({ name: 'PieChart' }).vm.$.vnode.key).toBe(
      'device-1',
    );
    expect(wrapper.getComponent({ name: 'BarChart' }).vm.$.vnode.key).toBe(
      'audience-1',
    );
    expect(wrapper.getComponent({ name: 'HeatmapChart' }).vm.$.vnode.key).toBe(
      'activity-1',
    );
  });

  it('Header 刷新触发重新拉取并重播动画', async () => {
    mocks.fetchStats.mockResolvedValue(sample());
    const wrapper = mount(DashboardPage);
    await flushPromises();
    await nextTick();

    expect(mocks.fetchStats).toHaveBeenCalledTimes(1);

    await mocks.refresh?.();
    await flushPromises();
    await nextTick();

    expect(mocks.fetchStats).toHaveBeenCalledTimes(2);
    expect(wrapper.getComponent({ name: 'PieChart' }).vm.$.vnode.key).toBe(
      'device-2',
    );
  });

  it('接口失败时不崩溃，卡片保留 0 且 loading 收起', async () => {
    mocks.fetchStats.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const wrapper = mount(DashboardPage);
    await flushPromises();
    await nextTick();

    const spin = wrapper.getComponent({ name: 'ASpin' });
    expect(spin.props('spinning')).toBe(false);
    expect(
      wrapper.findAllComponents({ name: 'AStatistic' }).at(0)?.props('value'),
    ).toBe(0);

    spy.mockRestore();
  });
});
