/**
 * 首页 Dashboard 统计契约。所有块在一次请求里返回，
 * 数字全部由后端聚合完成，前端不做业务计算。
 */

/** 环比变化。上一周期为 0 时无法计算，percent 为 null，前端不渲染趋势。 */
export interface TrendValue {
  value: number;
  trend?: TrendRate | null;
}

export interface TrendRate {
  /** 相对上一周期的变化百分比，已四舍五入到两位。 */
  percent: number;
  up: boolean;
}

/** 概览卡片：值 + 各自对应的对比周期，null 表示该卡无趋势语义。 */
export interface DashboardSummary {
  /** 未删除用户总数，对比今年新增。 */
  totalUsers: TrendValue;
  /** 今日登录次数（含失败），对比昨日。 */
  todayLogins: TrendValue;
  /** 近 7 天登录次数（含失败），对比前 7 天。 */
  weekLogins: TrendValue;
  /** 近 24 小时登录失败次数（含被锁定拦截），对比前一个 24 小时。 */
  recentFailures: TrendValue;
}

export interface NamedCount {
  name: string;
  value: number;
}

/** 终端占比：未识别 UA 计入 desktop，保证分段之和等于 total。 */
export interface DashboardDevices {
  total: number;
  mobile: number;
  tablet: number;
  desktop: number;
}

/** 近 12 个自然月，从 12 个月前所在的月排到当前月。 */
export interface MonthlyPoint {
  /** YYYY-MM。 */
  key: string;
  /** 图表分类轴展示名，如 "5月"。 */
  label: string;
  value: number;
}

export interface DashboardMonthlyTrend {
  months: MonthlyPoint[];
}

/**
 * 活跃热力图。hourBuckets 为 [起始小时, 结束小时) 区间，桶左闭右开、
 * 覆盖 0-24 无缝隙；cell 以 weekdays 为外层、hourBuckets 为内层展开，
 * 即 index = dayIndex * hourBuckets.length + bucketIndex。
 */
export interface DashboardActivityHeatmap {
  since: string;
  weekdays: string[];
  hourBuckets: Array<[number, number]>;
  cells: number[];
  max: number;
}

/** 浏览器 Top N + 「其他」兜底，统计近 30 天成功登录。 */
export interface DashboardBrowsers {
  total: number;
  items: NamedCount[];
}

/** 用户部门分布 Top N + 「未分配」。 */
export interface DashboardDeptDistribution {
  totalUsers: number;
  items: NamedCount[];
}

/** 热门操作模块，统计近 30 天操作日志。 */
export interface DashboardTopModules {
  since: string;
  items: Array<{
    /** 未标注模块的日志归为「其他」。 */
    module: string;
    count: number;
    failures: number;
    /** 平均耗时，秒（一位小数）。 */
    avgDurationSeconds: number;
  }>;
}

export interface DashboardStatistics {
  generatedAt: string;
  summary: DashboardSummary;
  devices: DashboardDevices;
  monthlyTrend: DashboardMonthlyTrend;
  activityHeatmap: DashboardActivityHeatmap;
  browsers: DashboardBrowsers;
  deptDistribution: DashboardDeptDistribution;
  topModules: DashboardTopModules;
}
