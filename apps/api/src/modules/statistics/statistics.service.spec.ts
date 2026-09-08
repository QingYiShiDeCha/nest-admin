import type { DrizzleDB } from '../../database/database.constants';
import {
  StatisticsService,
  toBrowsers,
  toDevices,
  toHeatmap,
  toMonthlyTrend,
} from './statistics.service';

function event(createdAt: Date, userAgent: string | null) {
  return { createdAt, userAgent };
}

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0';

describe('首页统计聚合', () => {
  it('终端占比按 UA 分桶且总数对齐', () => {
    const devices = toDevices([
      event(new Date('2026-05-10T08:00:00'), CHROME),
      event(new Date('2026-05-10T09:00:00'), IPHONE),
      event(new Date('2026-05-10T10:00:00'), null),
    ]);

    expect(devices).toEqual({
      total: 3,
      mobile: 1,
      tablet: 0,
      desktop: 2, // CHROME + UA 缺失兜底
    });
  });

  it('浏览器榜保留 TopN，其余并入其他浏览器', () => {
    const rows = [
      ...Array.from({ length: 9 }, () =>
        event(new Date('2026-05-10T08:00:00'), CHROME),
      ),
      ...Array.from({ length: 7 }, () =>
        event(new Date('2026-05-10T08:00:00'), EDGE),
      ),
      ...Array.from({ length: 5 }, () =>
        event(new Date('2026-05-10T08:00:00'), IPHONE),
      ),
      event(new Date('2026-05-10T08:00:00'), 'unknown-bot/1'),
    ];

    const browsers = toBrowsers(rows);

    expect(browsers.total).toBe(rows.length);
    expect(browsers.items[0]).toEqual({ name: '谷歌浏览器', value: 9 });
    expect(browsers.items.at(-1)).toEqual({ name: '其他浏览器', value: 1 });
    expect(browsers.items.reduce((sum, item) => sum + item.value, 0)).toBe(
      rows.length,
    );
  });

  it('月趋势补齐 12 个自然月并带展示标签', () => {
    const now = new Date('2026-05-20T12:00:00');
    const trend = toMonthlyTrend(
      [
        event(new Date('2026-05-01T08:00:00'), CHROME),
        event(new Date('2026-05-02T08:00:00'), CHROME),
        event(new Date('2026-04-15T08:00:00'), CHROME),
      ],
      now,
    );

    expect(trend.months).toHaveLength(12);
    expect(trend.months.at(-1)).toEqual({
      key: '2026-05',
      label: '5月',
      value: 2,
    });
    expect(trend.months.at(-2)).toEqual({
      key: '2026-04',
      label: '4月',
      value: 1,
    });
    expect(trend.months[0]).toEqual({ key: '2025-06', label: '6月', value: 0 });
  });

  it('热力图 cells 长度为天×时，值落在正确单元格', () => {
    // 2026-05-11 周一，09:00
    const monday = new Date(2026, 4, 11, 9, 0, 0);
    const since = new Date(2026, 4, 5);
    const heatmap = toHeatmap([event(monday, CHROME)], since);

    expect(heatmap.hourBuckets).toHaveLength(24);
    expect(heatmap.cells).toHaveLength(7 * 24);
    expect(heatmap.max).toBe(1);
    // weekday 1 (index 0) × hour 9 => index 9
    expect(heatmap.cells[9]).toBe(1);
    expect(heatmap.cells[0]).toBe(0);
  });

  it('空事件集不产生除零与脏数据', () => {
    const now = new Date('2026-05-20T12:00:00');
    expect(toDevices([])).toEqual({
      total: 0,
      mobile: 0,
      tablet: 0,
      desktop: 0,
    });
    expect(toBrowsers([])).toEqual({ total: 0, items: [] });
    expect(
      toMonthlyTrend([], now).months.every((month) => month.value === 0),
    ).toBe(true);
  });
});

/**
 * 一次 dashboard() 会按固定顺序触发 11 次 select：events、
 * users 总数、users 本年、4 次 countLogins、2 次 countFailedLogins、
 * 部门分布、操作模块。用队列把每次结果喂给调用方。
 */
function createDatabase(results: unknown[]) {
  let index = 0;

  const builder = (): unknown => {
    const slot = index;
    index += 1;
    const self: Record<string, unknown> = {};

    for (const method of [
      'from',
      'leftJoin',
      'where',
      'groupBy',
      'orderBy',
      'limit',
    ]) {
      self[method] = () => self;
    }

    self.then = (resolve: (value: unknown) => void) =>
      resolve(results[slot] ?? []);

    return self;
  };

  return {
    select: () => builder(),
  } as unknown as DrizzleDB;
}

describe('StatisticsService', () => {
  it('装配单次请求所需的完整快照', async () => {
    const monday = new Date(2026, 4, 11, 9, 30, 0);
    // 固定 now，让 todayLogins/weekLogins 边界与月序列都能预测
    jest.useFakeTimers({ now: new Date(2026, 4, 13, 12, 0, 0) }); // Wed
    const db = createDatabase([
      [{ createdAt: monday, userAgent: CHROME }], // events（近 30 天成功登录）
      [{ total: 100 }], // users 未删除总数
      [{ total: 20 }], // 本年新增
      [{ total: 12 }], // 今日登录
      [{ total: 6 }], // 昨日登录
      [{ total: 40 }], // 近 7 天
      [{ total: 80 }], // 前 7 天
      [{ total: 3 }], // 近 24 小时失败
      [{ total: 1 }], // 前 24-48 小时失败
      [
        { name: '研发部', total: 10 },
        { name: null, total: 4 },
        { name: '市场部', total: 20 },
      ],
      [
        {
          module: '用户管理',
          total: 50,
          failures: '2',
          avgDurationMs: '120.4',
        },
      ],
    ]);
    const service = new StatisticsService(db);

    const snapshot = await service.dashboard();
    jest.useRealTimers();

    expect(snapshot.summary).toEqual({
      totalUsers: { value: 100, trend: { percent: 20, up: true } },
      todayLogins: { value: 12, trend: { percent: 100, up: true } },
      weekLogins: { value: 40, trend: { percent: 50, up: false } },
      recentFailures: { value: 3, trend: { percent: 200, up: true } },
    });
    expect(snapshot.devices).toEqual({
      total: 1,
      mobile: 0,
      tablet: 0,
      desktop: 1,
    });
    expect(snapshot.browsers).toEqual({
      total: 1,
      items: [{ name: '谷歌浏览器', value: 1 }],
    });
    expect(snapshot.deptDistribution).toEqual({
      totalUsers: 34,
      items: [
        { name: '市场部', value: 20 },
        { name: '研发部', value: 10 },
        { name: '未分配部门', value: 4 },
      ],
    });
    expect(snapshot.topModules.items).toEqual([
      {
        module: '用户管理',
        count: 50,
        failures: 2,
        avgDurationSeconds: 0.1,
      },
    ]);
    expect(snapshot.monthlyTrend.months.at(-1)).toEqual({
      key: '2026-05',
      label: '5月',
      value: 1,
    });
    expect(snapshot.activityHeatmap.cells[monday.getHours()]).toBe(1);
    expect(snapshot.generatedAt).toBe(
      new Date(2026, 4, 13, 12, 0, 0).toISOString(),
    );
  });

  it('单块查询失败只降级该块，不影响整体响应', async () => {
    // events 抛错，其余按 0/空返回。safe() 兜住每一块。
    jest.useFakeTimers({ now: new Date(2026, 4, 13, 12, 0, 0) });
    let call = 0;
    const throwing = () => {
      const self: Record<string, unknown> = {};
      for (const method of [
        'from',
        'leftJoin',
        'where',
        'groupBy',
        'orderBy',
        'limit',
      ]) {
        self[method] = () => self;
      }
      self.then = (
        resolve: (v: unknown) => void,
        reject: (error: unknown) => void,
      ) => {
        call += 1;
        if (call === 1) reject(new Error('connection lost'));
        else resolve([]);
      };
      return self;
    };
    const service = new StatisticsService({
      select: () => throwing(),
    } as unknown as DrizzleDB);

    const snapshot = await service.dashboard();
    jest.useRealTimers();

    expect(snapshot.devices.total).toBe(0);
    expect(snapshot.browsers.items).toEqual([]);
    expect(snapshot.summary.totalUsers.value).toBe(0);
    expect(snapshot.deptDistribution.items).toEqual([]);
    expect(snapshot.topModules.items).toEqual([]);
  });
});
