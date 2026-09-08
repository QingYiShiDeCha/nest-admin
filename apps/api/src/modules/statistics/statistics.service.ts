import {
  departments,
  loginLogs,
  operationLogs,
  users,
} from '@nest-admin/database';
import type {
  DashboardActivityHeatmap,
  DashboardBrowsers,
  DashboardDeptDistribution,
  DashboardDevices,
  DashboardMonthlyTrend,
  DashboardStatistics,
  DashboardSummary,
  DashboardTopModules,
  NamedCount,
  TrendRate,
} from '@nest-admin/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq, gte, isNull, lt, ne, sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../../database/database.constants';
import {
  browserAlias,
  parseBrowserName,
  parseDeviceKind,
  type BrowserName,
  type DeviceKind,
} from './user-agent';

const DAY_MS = 24 * 60 * 60 * 1000;
/** 图表类统计统一取近 30 天窗口，月趋势展示窗口内的近 12 个自然月。 */
const EVENT_WINDOW_DAYS = 30;
const BROWSER_TOP_LIMIT = 5;
const DEPT_TOP_LIMIT = 5;
const MODULE_TOP_LIMIT = 6;
const HEATMAP_DAYS = 7;
const HEATMAP_HOURS = 24;
const MONTH_TREND_SIZE = 12;

interface LoginEvent {
  createdAt: Date;
  userAgent: string | null;
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async dashboard(): Promise<DashboardStatistics> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - EVENT_WINDOW_DAYS * DAY_MS);

    // 近 30 天登录成功事件只取一次：终端/浏览器/月趋势/热力四项都在内存派生，
    // UA 解析没有可靠的 SQL 对等物，一次取回比四条异构聚合更省也更准。
    const events = await this.safe(
      '近 30 天登录事件',
      this.db
        .select({
          createdAt: loginLogs.createdAt,
          userAgent: loginLogs.userAgent,
        })
        .from(loginLogs)
        .where(
          and(
            eq(loginLogs.status, 'success'),
            gte(loginLogs.createdAt, windowStart),
          ),
        ),
      [] as LoginEvent[],
    );

    const [summary, depts, mods] = await Promise.all([
      this.loadSummary(now),
      this.loadDeptDistribution(),
      this.loadTopModules(now),
    ]);

    return {
      generatedAt: now.toISOString(),
      summary,
      devices: toDevices(events),
      monthlyTrend: toMonthlyTrend(events, now),
      activityHeatmap: toHeatmap(events, windowStart),
      browsers: toBrowsers(events),
      deptDistribution: depts,
      topModules: mods,
    };
  }

  private async loadSummary(now: Date): Promise<DashboardSummary> {
    const db = this.db;
    const [
      totalUsers,
      yearNewUsers,
      loginsToday,
      loginsPrevDay,
      loginsWeek,
      loginsPrevWeek,
      failuresDay,
      failuresPrevDay,
    ] = await Promise.all([
      this.safe(
        '用户总数',
        db
          .select({ total: count() })
          .from(users)
          .where(isNull(users.deletedAt)),
        [{ total: 0 }],
      ).then((r) => r[0]?.total ?? 0),
      this.safe(
        '本年新增用户',
        db
          .select({ total: count() })
          .from(users)
          .where(
            and(
              isNull(users.deletedAt),
              gte(users.createdAt, new Date(now.getFullYear(), 0, 1)),
            ),
          ),
        [{ total: 0 }],
      ).then((r) => r[0]?.total ?? 0),
      this.countLogins(
        now,
        new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      ),
      this.countLogins(
        new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      ),
      this.countLogins(now, new Date(now.getTime() - 7 * DAY_MS)),
      this.countLogins(
        new Date(now.getTime() - 7 * DAY_MS),
        new Date(now.getTime() - 14 * DAY_MS),
      ),
      this.countFailedLogins(now, new Date(now.getTime() - DAY_MS)),
      this.countFailedLogins(
        new Date(now.getTime() - DAY_MS),
        new Date(now.getTime() - 2 * DAY_MS),
      ),
    ]);

    return {
      totalUsers: {
        value: totalUsers,
        // 卡的趋势位放「本年新增占比」：上一周期为 0 的百分比没有意义
        trend:
          totalUsers > 0
            ? { percent: round2((yearNewUsers / totalUsers) * 100), up: true }
            : null,
      },
      todayLogins: {
        value: loginsToday,
        trend: rate(loginsToday, loginsPrevDay),
      },
      weekLogins: {
        value: loginsWeek,
        trend: rate(loginsWeek, loginsPrevWeek),
      },
      recentFailures: {
        value: failuresDay,
        trend: rate(failuresDay, failuresPrevDay),
      },
    };
  }

  private async countLogins(from: Date, since: Date): Promise<number> {
    const rows = await this.safe(
      '登录次数',
      this.db
        .select({ total: count() })
        .from(loginLogs)
        .where(
          and(gte(loginLogs.createdAt, since), lt(loginLogs.createdAt, from)),
        ),
      [{ total: 0 }],
    );

    return rows[0]?.total ?? 0;
  }

  private async countFailedLogins(from: Date, since: Date): Promise<number> {
    const rows = await this.safe(
      '登录失败次数',
      this.db
        .select({ total: count() })
        .from(loginLogs)
        .where(
          and(
            ne(loginLogs.status, 'success'),
            gte(loginLogs.createdAt, since),
            lt(loginLogs.createdAt, from),
          ),
        ),
      [{ total: 0 }],
    );

    return rows[0]?.total ?? 0;
  }

  private async loadDeptDistribution(): Promise<DashboardDeptDistribution> {
    const rows = await this.safe(
      '部门用户分布',
      this.db
        .select({ name: departments.name, total: count(users.id) })
        .from(users)
        .leftJoin(
          departments,
          and(eq(users.deptId, departments.id), isNull(departments.deletedAt)),
        )
        .where(isNull(users.deletedAt))
        .groupBy(departments.id, departments.name),
      [] as Array<{ name: string | null; total: number }>,
    );

    const unassignedIndex = rows.findIndex((row) => row.name === null);
    const unassigned =
      unassignedIndex === -1
        ? 0
        : (rows.splice(unassignedIndex, 1)[0] as { total: number }).total;
    const named = rows
      .map((row) => ({ name: row.name as string, value: row.total }))
      .sort((a, b) => b.value - a.value);
    const items = named.slice(0, DEPT_TOP_LIMIT);

    if (unassigned > 0) items.push({ name: '未分配部门', value: unassigned });

    return {
      totalUsers: named.reduce((sum, item) => sum + item.value, 0) + unassigned,
      items,
    };
  }

  private async loadTopModules(now: Date): Promise<DashboardTopModules> {
    const since = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - EVENT_WINDOW_DAYS,
    );
    const rows = await this.safe(
      '热门操作模块',
      this.db
        .select({
          module: operationLogs.module,
          total: count(),
          failures: sql<string>`sum(case when ${operationLogs.status} = ${'failure'} then 1 else 0 end)`,
          avgDurationMs: sql<string>`avg(${operationLogs.durationMs})`,
        })
        .from(operationLogs)
        .where(gte(operationLogs.createdAt, since))
        .groupBy(operationLogs.module)
        .orderBy(desc(sql`total`))
        .limit(MODULE_TOP_LIMIT),
      [] as Array<{
        module: string | null;
        total: number;
        failures: string | null;
        avgDurationMs: string | null;
      }>,
    );

    return {
      since: since.toISOString(),
      items: rows.map((row) => ({
        module: row.module ?? '未标注模块',
        count: row.total,
        failures: Number(row.failures ?? 0),
        avgDurationSeconds: round1(Number(row.avgDurationMs ?? 0) / 1000),
      })),
    };
  }

  /** 某个统计块查询失败只降级该块，不能拖垮整页——首页可用性优先。 */
  private async safe<T>(
    label: string,
    query: Promise<T>,
    fallback: T,
  ): Promise<T> {
    try {
      return await query;
    } catch (error) {
      this.logger.warn(
        `首页统计「${label}」查询失败，已降级：${error instanceof Error ? error.message : String(error)}`,
      );
      return fallback;
    }
  }
}

export function toDevices(rows: LoginEvent[]): DashboardDevices {
  const buckets: Record<DeviceKind, number> = {
    mobile: 0,
    tablet: 0,
    desktop: 0,
  };

  for (const row of rows) {
    buckets[parseDeviceKind(row.userAgent ?? '')] += 1;
  }

  return {
    total: rows.length,
    mobile: buckets.mobile,
    tablet: buckets.tablet,
    desktop: buckets.desktop,
  };
}

/** Top N 之外的浏览器合并为「其他浏览器」，尾部长尾不进榜单。 */
export function toBrowsers(rows: LoginEvent[]): DashboardBrowsers {
  const counts = new Map<BrowserName, number>();

  for (const row of rows) {
    const name = parseBrowserName(row.userAgent ?? '');
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const others = counts.get('Others') ?? 0;
  counts.delete('Others');
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const items: NamedCount[] = sorted
    .slice(0, BROWSER_TOP_LIMIT)
    .map(([name, value]) => ({ name: browserAlias(name), value }));
  const rest = sorted
    .slice(BROWSER_TOP_LIMIT)
    .reduce((sum, [, value]) => sum + value, 0);

  if (others + rest > 0) {
    items.push({ name: browserAlias('Others'), value: others + rest });
  }

  return { total: rows.length, items };
}

/** 近 12 个自然月完整序列（含 0 值月），月首为 YYYY-MM。 */
export function toMonthlyTrend(
  rows: LoginEvent[],
  now: Date,
): DashboardMonthlyTrend {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = monthKey(row.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const months: DashboardMonthlyTrend['months'] = [];

  for (let i = MONTH_TREND_SIZE - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(date);
    months.push({
      key,
      label: `${date.getMonth() + 1}月`,
      value: counts.get(key) ?? 0,
    });
  }

  return { months };
}

/** 周几为外层、小时为内层展开（对齐 DashboardActivityHeatmap 契约）。 */
export function toHeatmap(
  rows: LoginEvent[],
  since: Date,
): DashboardActivityHeatmap {
  const cells = new Map<string, number>();

  for (const row of rows) {
    const key = `${isoWeekday(row.createdAt)}:${row.createdAt.getHours()}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }

  const values: number[] = [];
  let max = 0;

  for (let day = 0; day < HEATMAP_DAYS; day += 1) {
    for (let hour = 0; hour < HEATMAP_HOURS; hour += 1) {
      const value = cells.get(`${day + 1}:${hour}`) ?? 0;
      values.push(value);
      if (value > max) max = value;
    }
  }

  return {
    since: since.toISOString(),
    weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    hourBuckets: Array.from({ length: HEATMAP_HOURS }, (_, h) => [h, h + 1]),
    cells: values,
    max,
  };
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isoWeekday(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

function rate(current: number, previous: number): TrendRate | null {
  if (current === 0 && previous === 0) return { percent: 0, up: true };
  if (previous === 0) return null;

  const percent = round2(((current - previous) / previous) * 100);

  return { percent: Math.abs(percent), up: percent >= 0 };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
