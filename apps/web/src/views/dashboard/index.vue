<script setup lang="ts">
import type {
  DashboardStatistics,
  NamedCount,
  TrendValue,
} from '@nest-admin/shared';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { apiDashboardStatistics } from '@/api/statistics';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import {
  BarChart,
  HeatmapChart,
  PieChart,
  type HeatmapChartDatum,
} from '@/components/core/charts';
import { usePageRefresh } from '@/composables/use-page-refresh';
import { SEMANTIC_COLORS } from '@/constants/palette';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const chartAnimationVersion = ref(0);
const stats = ref<DashboardStatistics | null>(null);
const loading = ref(true);

/**
 * 图表消费的主题色，来源与 App.vue 的 token 相同（palette 单一来源）。
 * computed 而不是普通对象：主色是可切换的，绑定 :style 时要保持响应式。
 */
const themeVars = computed(() => ({
  '--dash-blue': settings.primaryColor,
  '--dash-green': SEMANTIC_COLORS.success,
  '--dash-cyan': SEMANTIC_COLORS.info,
  '--dash-orange': SEMANTIC_COLORS.warning,
  '--dash-danger': SEMANTIC_COLORS.danger,
}));

interface StatCard {
  icon: string;
  tint: 'blue' | 'cyan' | 'green' | 'orange';
  label: string;
  value: number;
  precision: number;
  trend: TrendValue['trend'];
  /** trend 之后的语义提示，如 「较昨日」「本年新增」 */
  suffix: string;
}

const BROWSER_COLORS = [
  '#4080ff',
  '#0ea5a4',
  '#f59e0b',
  '#f43f5e',
  '#e11d48',
  '#8b5cf6',
  '#22c55e',
  '#38bdf8',
  '#fb923c',
  '#94a3b8',
];

/** 一周活跃时段热力图把 24 小时每 4 小时折叠为一行，避免 24 行压不成图。 */
const HEATMAP_HOURS = 24;
const HEATMAP_ROWS = 6;
const HEATMAP_HOURS_PER_ROW = HEATMAP_HOURS / HEATMAP_ROWS;

const statCards = computed<StatCard[]>(() => {
  const summary = stats.value?.summary;

  if (!summary) {
    return [
      { icon: 'i-ri:user-3-line', tint: 'blue', label: '系统用户', value: 0, precision: 0, trend: null, suffix: '本年新增' },
      { icon: 'i-ri:login-circle-line', tint: 'cyan', label: '今日登录', value: 0, precision: 0, trend: null, suffix: '较昨日' },
      { icon: 'i-ri:pulse-line', tint: 'green', label: '近 7 天登录', value: 0, precision: 0, trend: null, suffix: '较前 7 天' },
      { icon: 'i-ri:shield-warning-line', tint: 'orange', label: '近 24 小时失败', value: 0, precision: 0, trend: null, suffix: '较前一周期' },
    ];
  }

  return [
    { icon: 'i-ri:user-3-line', tint: 'blue', label: '系统用户', value: summary.totalUsers.value, precision: 0, trend: summary.totalUsers.trend, suffix: '本年新增' },
    { icon: 'i-ri:login-circle-line', tint: 'cyan', label: '今日登录', value: summary.todayLogins.value, precision: 0, trend: summary.todayLogins.trend, suffix: '较昨日' },
    { icon: 'i-ri:pulse-line', tint: 'green', label: '近 7 天登录', value: summary.weekLogins.value, precision: 0, trend: summary.weekLogins.trend, suffix: '较前 7 天' },
    { icon: 'i-ri:shield-warning-line', tint: 'orange', label: '近 24 小时失败', value: summary.recentFailures.value, precision: 0, trend: summary.recentFailures.trend, suffix: '较前一周期' },
  ];
});

const statisticClasses = {
  content: '!text-2xl !font-semibold !leading-[1.4] a-color-text',
};
const animatedStatValues = ref<number[]>([0, 0, 0, 0]);
let statAnimationFrame: number | undefined;
let finishStatAnimation: (() => void) | undefined;

function stopStatAnimation(): void {
  if (statAnimationFrame !== undefined) {
    cancelAnimationFrame(statAnimationFrame);
    statAnimationFrame = undefined;
  }
  finishStatAnimation?.();
  finishStatAnimation = undefined;
}

function animateStatCards(): Promise<void> {
  stopStatAnimation();
  const targets = statCards.value.map((card) => card.value);
  animatedStatValues.value = targets.map(() => 0);

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    animatedStatValues.value = targets;
    return Promise.resolve();
  }

  const startedAt = performance.now();
  const duration = 1_000;

  return new Promise((resolve) => {
    finishStatAnimation = resolve;

    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      animatedStatValues.value = targets.map((value) => value * eased);

      if (progress < 1) {
        statAnimationFrame = requestAnimationFrame(update);
        return;
      }

      statAnimationFrame = undefined;
      finishStatAnimation = undefined;
      resolve();
    };

    statAnimationFrame = requestAnimationFrame(update);
  });
}

async function replayDashboardAnimations(): Promise<void> {
  chartAnimationVersion.value += 1;
  await nextTick();
  await animateStatCards();
}

async function loadStats(): Promise<void> {
  try {
    stats.value = await apiDashboardStatistics();
    await replayDashboardAnimations();
  } catch (error) {
    console.warn('[dashboard] load failed', error);
  } finally {
    loading.value = false;
  }
}

usePageRefresh(async () => {
  await loadStats();
});

onMounted(() => void loadStats());
onBeforeUnmount(stopStatAnimation);

/** 终端占比：未识别 UA 计入桌面端，三段之和与 devices.total 对齐 */
const deviceSegments = computed(() => {
  const devices = stats.value?.devices;
  const segments = [
    { label: '手机', key: 'mobile' as const, color: 'var(--dash-blue)' },
    { label: '平板', key: 'tablet' as const, color: 'var(--dash-green)' },
    { label: '桌面端', key: 'desktop' as const, color: 'var(--dash-orange)' },
  ];

  return segments.map((segment) => ({
    ...segment,
    value: devices ? devices[segment.key] : 0,
  }));
});
const deviceTotal = computed(() => stats.value?.devices.total ?? 0);
const deviceChartData = computed(() =>
  deviceSegments.value.map((segment) => ({
    name: segment.label,
    value: segment.value,
  })),
);

/** 近 12 个自然月的月登录趋势；后端已把月份补零。 */
const audienceSeries = computed(() => [
  {
    name: '登录次数',
    data: (stats.value?.monthlyTrend.months ?? []).map((month) => month.value),
  },
]);
const monthLabels = computed(() =>
  (stats.value?.monthlyTrend.months ?? []).map((month) => month.label),
);
const yAxisMax = computed(() => {
  const max = Math.max(0, ...(stats.value?.monthlyTrend.months ?? []).map((m) => m.value));
  if (max === 0) return 5;
  const step = Math.max(1, Math.pow(10, Math.max(0, String(max).length - 1)));
  return Math.ceil(max / step) * step;
});

/** 浏览器 Top 榜：颜色按顺序从调色板轮询，前段用主色系、尾部用中性色。 */
const browsers = computed(() =>
  ((stats.value?.browsers.items ?? []) as NamedCount[]).map((item, index) => ({
    ...item,
    color: BROWSER_COLORS[index % BROWSER_COLORS.length] as string,
    short: (item.name.match(/[A-Za-z]+/)?.[0] ?? item.name.slice(0, 1)).slice(0, 1).toUpperCase(),
  })),
);
const browserMax = computed(() => Math.max(0, ...browsers.value.map((b) => b.value)));

/** 部门分布 —— 替换原「访客国家」表 */
const deptRows = computed(() => {
  const total = stats.value?.deptDistribution.totalUsers || 1;
  return ((stats.value?.deptDistribution.items ?? []) as NamedCount[]).map(
    (item) => ({
      ...item,
      percent: Math.max(1, Math.round((item.value / total) * 100)),
    }),
  );
});

/** 热门操作模块 —— 替换原「热门活动」表 */
const moduleRows = computed(
  () =>
    stats.value?.topModules.items ??
    ([] as DashboardStatistics['topModules']['items']),
);

/**
 * 热力图数据：后端 cells 索引 = day * HEATMAP_HOURS + hour，逐小时计数。
 * 前端每 4 小时折叠成一行（6 行 × 7 天），[col,row,value] 是给组件的三元组。
 */
const heatmapData = computed<HeatmapChartDatum[]>(() => {
  const heatmap = stats.value?.activityHeatmap;

  if (!heatmap) return [];

  const fold: HeatmapChartDatum[] = [];

  for (let day = 0; day < heatmap.weekdays.length; day += 1) {
    for (let row = 0; row < HEATMAP_ROWS; row += 1) {
      let sum = 0;

      for (let h = 0; h < HEATMAP_HOURS_PER_ROW; h += 1) {
        const hourIndex = row * HEATMAP_HOURS_PER_ROW + h;
        sum += heatmap.cells[day * HEATMAP_HOURS + hourIndex] ?? 0;
      }

      fold.push([day, row, sum]);
    }
  }

  return fold;
});
const heatmapMax = computed(() => {
  const values = heatmapData.value.map((cell) => cell[2]);
  return Math.max(...values, 100);
});
const heatmapYLabels = computed<string[]>(() => {
  const labels = [];
  for (let row = 0; row < HEATMAP_ROWS; row += 1) {
    labels.push(`${String(row * HEATMAP_HOURS_PER_ROW).padStart(2, '0')}时`);
  }
  return labels;
});
const heatmapXLabels = computed<string[]>(
  () => stats.value?.activityHeatmap.weekdays ?? [],
);

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds * 10) / 10);
  if (rounded < 1) return `${Math.round(rounded * 1000)}ms`;
  return `${rounded.toFixed(1)}s`;
}

defineOptions({ name: 'DashboardPage' });
</script>

<template>
  <div class="dash" :style="themeVars">
    <a-spin :spinning="loading" size="large">
      <div class="dash-board">
        <div class="dash-main">
          <!-- 统计卡行 -->
          <div class="dash-stats">
            <div
              v-for="(card, index) in statCards"
              :key="card.label"
              class="panel stat-card"
            >
              <div class="stat-icon" :class="`tint-${card.tint}`">
                <AppIcon :icon="card.icon" />
              </div>
              <div class="stat-meta">
                <div class="stat-label">{{ card.label }}</div>
                <a-statistic
                  class="stat-value"
                  :value="animatedStatValues[index]"
                  :precision="card.precision"
                  :classes="statisticClasses"
                />
                <div
                  v-if="card.trend"
                  class="stat-trend"
                  :class="card.trend.up ? 'up' : 'down'"
                >
                  {{ card.trend.up ? '↑' : '↓' }}
                  {{ card.trend.percent.toFixed(2) }}% {{ card.suffix }}
                </div>
                <div v-else class="stat-trend muted">暂无对比</div>
              </div>
            </div>
          </div>

          <!-- 环形图 + 柱状图，约 1 : 2.5 -->
          <div class="dash-split">
            <a-card title="终端登录占比" class="dash-card">
              <PieChart
                :key="`device-${chartAnimationVersion}`"
                class="h-60 w-full"
                :data="deviceChartData"
                :center-value="deviceTotal.toLocaleString()"
                inner-radius="66%"
                outer-radius="86%"
                aria-label="终端登录占比"
              />
              <div class="donut-stats">
                <div v-for="seg in deviceSegments" :key="seg.label">
                  <div class="donut-num">{{ seg.value.toLocaleString() }}</div>
                  <div class="donut-label">
                    <span class="dot" :style="{ background: seg.color }" />
                    {{ seg.label }}
                  </div>
                </div>
              </div>
            </a-card>

            <a-card
              title="近 12 个月登录趋势"
              class="dash-card min-h-80 flex flex-col [&_.ant-card-body]:flex [&_.ant-card-body]:flex-1 [&_.ant-card-body]:min-h-0"
            >
              <BarChart
                :key="`audience-${chartAnimationVersion}`"
                class="min-h-60 w-full flex-1"
                :categories="monthLabels"
                :series="audienceSeries"
                :y-axis-max="yAxisMax"
                aria-label="近十二个月登录趋势"
              />
            </a-card>
          </div>

          <!-- 两张表：部门分布 + 热门模块 -->
          <div class="dash-split-eq">
            <a-card title="部门用户分布" class="dash-card">
              <table class="mini-table">
                <thead>
                  <tr>
                    <th class="w-12">序号</th>
                    <th>部门</th>
                    <th class="ta-r">人数</th>
                    <th class="ta-r w-20">占比</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in deptRows" :key="row.name">
                    <td class="w-12">{{ i + 1 }}</td>
                    <td>{{ row.name }}</td>
                    <td class="ta-r">{{ row.value.toLocaleString() }}</td>
                    <td class="ta-r">
                      <span class="percent-bar">
                        <span :style="{ width: `${row.percent}%` }" />
                      </span>
                      <span class="ml-2">{{ row.percent }}%</span>
                    </td>
                  </tr>
                  <tr v-if="deptRows.length === 0">
                    <td colspan="4" class="empty-cell">暂无数据</td>
                  </tr>
                </tbody>
              </table>
            </a-card>

            <a-card title="近 30 天热门操作模块" class="dash-card">
              <table class="mini-table">
                <thead>
                  <tr>
                    <th class="w-12">#</th>
                    <th>模块</th>
                    <th class="ta-r">次数</th>
                    <th class="ta-r">失败</th>
                    <th class="ta-r">均值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in moduleRows" :key="row.module">
                    <td class="w-12">{{ i + 1 }}</td>
                    <td>{{ row.module }}</td>
                    <td class="ta-r">{{ row.count.toLocaleString() }}</td>
                    <td class="ta-r">
                      <a-tag v-if="row.failures > 0" color="error">{{
                        row.failures
                      }}</a-tag>
                      <span v-else class="text-dim">0</span>
                    </td>
                    <td class="ta-r">{{ formatDuration(row.avgDurationSeconds) }}</td>
                  </tr>
                  <tr v-if="moduleRows.length === 0">
                    <td colspan="5" class="empty-cell">暂无数据</td>
                  </tr>
                </tbody>
              </table>
            </a-card>
          </div>
        </div>

        <!-- 右通栏 -->
        <div class="dash-rail">
          <a-card title="浏览器使用洞察" class="dash-card">
            <ul v-if="browsers.length > 0" class="browser-list">
              <li v-for="b in browsers" :key="b.name">
                <div class="browser-row">
                  <span
                    class="browser-avatar"
                    :style="{ background: `${b.color}22`, color: b.color }"
                  >
                    {{ b.short }}
                  </span>
                  <span class="browser-name">{{ b.name }}</span>
                  <span class="browser-value">{{ b.value.toLocaleString() }}</span>
                </div>
                <div class="browser-bar">
                  <span
                    :style="{
                      width: `${browserMax === 0 ? 0 : (b.value / browserMax) * 100}%`,
                      background: b.color,
                    }"
                  />
                </div>
              </li>
            </ul>
            <a-empty v-else description="近 30 天暂无登录" />
          </a-card>

          <a-card title="一周登录热力" class="dash-card">
            <HeatmapChart
              :key="`activity-${chartAnimationVersion}`"
              class="h-60 w-full"
              :x-labels="heatmapXLabels"
              :y-labels="heatmapYLabels"
              :data="heatmapData"
              :max="heatmapMax"
              aria-label="一周登录热力"
            />
          </a-card>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
/* 布局用到的主题色，接 echarts 时保持同一组取值 */
.dash {
  /* --dash-blue/green/cyan/orange/danger 由模板 :style 注入 */
  --dash-radius: 8px;
  --dash-container: var(--ant-color-bg-container);
  --dash-text: var(--ant-color-text);
  --dash-text-secondary: var(--ant-color-text-secondary);
  --dash-border: var(--ant-color-border-secondary);
  --dash-fill: var(--ant-color-fill-tertiary);
  color: var(--dash-text);
}

/* 左主体 + 右通栏；右栏定宽，窄屏折行 */
.dash-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.dash-main,
.dash-rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* 统计卡行：一行等宽四张 */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

/* 左主体 1 : 2.5 双列 */
.dash-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.5fr);
  gap: 16px;
}

/* 两张等宽表 */
.dash-split-eq {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel {
  background: var(--dash-container);
  border: 1px solid var(--dash-border);
  border-radius: var(--dash-radius);
  padding: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-size: 22px;
  flex-shrink: 0;
}

/* 浅色底用 color-mix 从语义色自动生成，跟随主题不必逐个调 */
.tint-blue {
  background: color-mix(in srgb, var(--dash-blue) 12%, var(--dash-container));
  color: var(--dash-blue);
}
.tint-cyan {
  background: color-mix(in srgb, var(--dash-cyan) 12%, var(--dash-container));
  color: var(--dash-cyan);
}
.tint-green {
  background: color-mix(in srgb, var(--dash-green) 12%, var(--dash-container));
  color: var(--dash-green);
}
.tint-orange {
  background: color-mix(in srgb, var(--dash-orange) 12%, var(--dash-container));
  color: var(--dash-orange);
}

.stat-label {
  font-size: 13px;
  color: var(--dash-text-secondary);
}
.stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}
.stat-trend {
  font-size: 12px;
}
.stat-trend.up {
  color: var(--dash-green);
}
.stat-trend.down {
  color: var(--dash-danger);
}
.stat-trend.muted {
  color: var(--dash-text-secondary);
}

.donut-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--dash-border);
  padding-top: 14px;
  text-align: center;
}
.donut-stats > div + div {
  border-left: 1px solid var(--dash-border);
}
.donut-num {
  font-size: 20px;
  font-weight: 600;
}
.donut-label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--dash-text-secondary);
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

/* ---- 轻量表格 ---- */
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.mini-table th {
  text-align: left;
  font-weight: 500;
  color: var(--dash-text-secondary);
  padding: 8px 4px;
  border-bottom: 1px solid var(--dash-border);
}
.mini-table td {
  padding: 10px 4px;
  border-bottom: 1px solid var(--dash-border);
}
.mini-table tr:last-child td {
  border-bottom: none;
}
.ta-r {
  text-align: right !important;
}
.w-12 {
  width: 48px;
}
.w-20 {
  width: 80px;
}
.text-dim {
  color: var(--dash-text-secondary);
}
.empty-cell {
  text-align: center;
  color: var(--dash-text-secondary);
  padding: 20px 0 !important;
}
.percent-bar {
  display: inline-block;
  vertical-align: middle;
  width: 40px;
  height: 4px;
  background: var(--dash-fill);
  border-radius: 2px;
  overflow: hidden;
}
.percent-bar > span {
  display: block;
  height: 100%;
  background: var(--dash-blue);
}

/* ---- 浏览器洞察 ---- */
.browser-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.browser-list li + li {
  margin-top: 16px;
}
.browser-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.browser-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}
.browser-name {
  flex: 1;
  font-weight: 500;
}
.browser-value {
  font-weight: 600;
}
.browser-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--dash-fill);
  margin-top: 8px;
  margin-left: 46px;
  overflow: hidden;
}
.browser-bar span {
  display: block;
  height: 100%;
  border-radius: 2px;
}

/* 窄屏：右栏折到下方成两列，双列改单列，统计卡两列 */
@media (max-width: 1280px) {
  .dash-board {
    grid-template-columns: 1fr;
  }
  .dash-rail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}
@media (max-width: 900px) {
  .dash-split,
  .dash-split-eq {
    grid-template-columns: 1fr;
  }
  .dash-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dash-rail {
    grid-template-columns: 1fr;
  }
}
</style>
