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
      {
        icon: 'i-ri:user-3-line',
        tint: 'blue',
        label: '系统用户',
        value: 0,
        precision: 0,
        trend: null,
        suffix: '本年新增',
      },
      {
        icon: 'i-ri:login-circle-line',
        tint: 'cyan',
        label: '今日登录',
        value: 0,
        precision: 0,
        trend: null,
        suffix: '较昨日',
      },
      {
        icon: 'i-ri:pulse-line',
        tint: 'green',
        label: '近 7 天登录',
        value: 0,
        precision: 0,
        trend: null,
        suffix: '较前 7 天',
      },
      {
        icon: 'i-ri:shield-warning-line',
        tint: 'orange',
        label: '近 24 小时失败',
        value: 0,
        precision: 0,
        trend: null,
        suffix: '较前一周期',
      },
    ];
  }

  return [
    {
      icon: 'i-ri:user-3-line',
      tint: 'blue',
      label: '系统用户',
      value: summary.totalUsers.value,
      precision: 0,
      trend: summary.totalUsers.trend,
      suffix: '本年新增',
    },
    {
      icon: 'i-ri:login-circle-line',
      tint: 'cyan',
      label: '今日登录',
      value: summary.todayLogins.value,
      precision: 0,
      trend: summary.todayLogins.trend,
      suffix: '较昨日',
    },
    {
      icon: 'i-ri:pulse-line',
      tint: 'green',
      label: '近 7 天登录',
      value: summary.weekLogins.value,
      precision: 0,
      trend: summary.weekLogins.trend,
      suffix: '较前 7 天',
    },
    {
      icon: 'i-ri:shield-warning-line',
      tint: 'orange',
      label: '近 24 小时失败',
      value: summary.recentFailures.value,
      precision: 0,
      trend: summary.recentFailures.trend,
      suffix: '较前一周期',
    },
  ];
});

/** 语义色浅底 + 图标前景色（静态类名字符串，供 UnoCSS 扫描生成） */
const TINT_CLASSES: Record<StatCard['tint'], string> = {
  blue: 'bg-[color-mix(in_srgb,var(--dash-blue)_12%,var(--ant-color-bg-container))] text-[var(--dash-blue)]',
  cyan: 'bg-[color-mix(in_srgb,var(--dash-cyan)_12%,var(--ant-color-bg-container))] text-[var(--dash-cyan)]',
  green:
    'bg-[color-mix(in_srgb,var(--dash-green)_12%,var(--ant-color-bg-container))] text-[var(--dash-green)]',
  orange:
    'bg-[color-mix(in_srgb,var(--dash-orange)_12%,var(--ant-color-bg-container))] text-[var(--dash-orange)]',
};

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
  const max = Math.max(
    0,
    ...(stats.value?.monthlyTrend.months ?? []).map((m) => m.value),
  );
  if (max === 0) return 5;
  const step = Math.max(1, Math.pow(10, Math.max(0, String(max).length - 1)));
  return Math.ceil(max / step) * step;
});

/** 浏览器 Top 榜：颜色按顺序从调色板轮询，前段用主色系、尾部用中性色。 */
const browsers = computed(() =>
  ((stats.value?.browsers.items ?? []) as NamedCount[]).map((item, index) => ({
    ...item,
    color: BROWSER_COLORS[index % BROWSER_COLORS.length] as string,
    short: (item.name.match(/[A-Za-z]+/)?.[0] ?? item.name.slice(0, 1))
      .slice(0, 1)
      .toUpperCase(),
  })),
);
const browserMax = computed(() =>
  Math.max(0, ...browsers.value.map((b) => b.value)),
);

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
  <div class="a-color-text" :style="themeVars">
    <a-spin :spinning="loading" size="large">
      <!-- 左主体 + 右通栏；右栏 320px，≤1280px 折为单列 -->
      <div
        class="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[1280px]:grid-cols-1"
      >
        <div class="flex flex-col gap-4 min-w-0">
          <!-- 统计卡行：≤1280px 两列，≥1281px 一行等宽四张 -->
          <div class="grid grid-cols-4 gap-4 max-[1280px]:grid-cols-2">
            <div
              v-for="(card, index) in statCards"
              :key="card.label"
              class="a-bg-container border border-solid a-border-border-secondary rounded-lg p-5 flex items-center gap-4"
            >
              <div
                class="grid place-items-center w-12 h-12 rounded-xl text-[22px] shrink-0"
                :class="TINT_CLASSES[card.tint]"
              >
                <AppIcon :icon="card.icon" />
              </div>
              <div>
                <div class="text-[13px] a-color-text-secondary">
                  {{ card.label }}
                </div>
                <a-statistic
                  class="whitespace-nowrap"
                  :value="animatedStatValues[index]"
                  :precision="card.precision"
                  :classes="statisticClasses"
                />
                <div
                  v-if="card.trend"
                  class="text-xs"
                  :class="
                    card.trend.up
                      ? 'text-[var(--dash-green)]'
                      : 'text-[var(--dash-danger)]'
                  "
                >
                  {{ card.trend.up ? '↑' : '↓' }}
                  {{ card.trend.percent.toFixed(2) }}% {{ card.suffix }}
                </div>
                <div v-else class="text-xs a-color-text-secondary">
                  暂无对比
                </div>
              </div>
            </div>
          </div>

          <!-- 环形图 + 柱状图，约 1 : 2.5；≤900px 折为单列 -->
          <div
            class="grid grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)] gap-4 max-[900px]:grid-cols-1"
          >
            <a-card title="终端登录占比">
              <PieChart
                :key="`device-${chartAnimationVersion}`"
                class="h-60 w-full"
                :data="deviceChartData"
                :center-value="deviceTotal.toLocaleString()"
                inner-radius="66%"
                outer-radius="86%"
                aria-label="终端登录占比"
              />
              <div
                class="grid grid-cols-3 border-t border-solid a-border-border-secondary pt-3.5 text-center"
              >
                <div
                  v-for="seg in deviceSegments"
                  :key="seg.label"
                  class="border-l border-solid a-border-border-secondary first:border-l-0"
                >
                  <div class="text-xl font-semibold">
                    {{ seg.value.toLocaleString() }}
                  </div>
                  <div class="mt-1 text-[13px] a-color-text-secondary">
                    <span
                      class="inline-block w-2 h-2 rounded-full mr-1"
                      :style="{ background: seg.color }"
                    />
                    {{ seg.label }}
                  </div>
                </div>
              </div>
            </a-card>

            <a-card
              title="近 12 个月登录趋势"
              class="min-h-80 flex flex-col [&_.ant-card-body]:flex [&_.ant-card-body]:flex-1 [&_.ant-card-body]:min-h-0"
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

          <!-- 两张等宽表；≤900px 折为单列 -->
          <div class="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            <a-card title="部门用户分布">
              <table class="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th
                      class="w-12 text-left font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary"
                    >
                      序号
                    </th>
                    <th
                      class="text-left font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary"
                    >
                      部门
                    </th>
                    <th
                      class="text-right font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary"
                    >
                      人数
                    </th>
                    <th
                      class="text-right font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary w-20"
                    >
                      占比
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in deptRows" :key="row.name">
                    <td
                      class="w-12 px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      {{ i + 1 }}
                    </td>
                    <td
                      class="px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      {{ row.name }}
                    </td>
                    <td
                      class="text-right px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      {{ row.value.toLocaleString() }}
                    </td>
                    <td
                      class="text-right px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      <span
                        class="inline-block align-middle w-10 h-1 rounded-sm overflow-hidden a-bg-fill-tertiary"
                      >
                        <span
                          class="block h-full bg-[var(--dash-blue)]"
                          :style="{ width: `${row.percent}%` }"
                        />
                      </span>
                      <span class="ml-2">{{ row.percent }}%</span>
                    </td>
                  </tr>
                  <tr v-if="deptRows.length === 0">
                    <td
                      colspan="4"
                      class="text-center a-color-text-secondary py-5"
                    >
                      暂无数据
                    </td>
                  </tr>
                </tbody>
              </table>
            </a-card>

            <a-card title="近 30 天热门操作模块">
              <table class="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th
                      class="w-12 text-left font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary"
                    >
                      #
                    </th>
                    <th
                      class="text-left font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary"
                    >
                      模块
                    </th>
                    <th
                      class="text-right font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary"
                    >
                      次数
                    </th>
                    <th
                      class="text-right font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary"
                    >
                      失败
                    </th>
                    <th
                      class="text-right font-medium a-color-text-secondary px-1 py-2 border-b border-solid a-border-border-secondary"
                    >
                      均值
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in moduleRows" :key="row.module">
                    <td
                      class="w-12 px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      {{ i + 1 }}
                    </td>
                    <td
                      class="px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      {{ row.module }}
                    </td>
                    <td
                      class="text-right px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      {{ row.count.toLocaleString() }}
                    </td>
                    <td
                      class="text-right px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      <a-tag v-if="row.failures > 0" color="error">{{
                        row.failures
                      }}</a-tag>
                      <span v-else class="text-dim a-color-text-secondary"
                        >0</span
                      >
                    </td>
                    <td
                      class="text-right px-1 py-2.5 border-b border-solid a-border-border-secondary [tr:last-child_&]:border-b-0"
                    >
                      {{ formatDuration(row.avgDurationSeconds) }}
                    </td>
                  </tr>
                  <tr v-if="moduleRows.length === 0">
                    <td
                      colspan="5"
                      class="text-center a-color-text-secondary py-5"
                    >
                      暂无数据
                    </td>
                  </tr>
                </tbody>
              </table>
            </a-card>
          </div>
        </div>

        <!-- 右通栏：≤900px 单列，901–1280px 两列，≥1281px 单列 -->
        <div
          class="flex flex-col gap-4 min-w-0 max-[1280px]:grid max-[1280px]:grid-cols-2 max-[1280px]:items-start max-[900px]:!flex max-[900px]:!flex-col"
        >
          <a-card title="浏览器使用洞察">
            <ul v-if="browsers.length > 0">
              <li v-for="b in browsers" :key="b.name" class="mt-4 first:mt-0">
                <div class="flex items-center gap-2.5">
                  <span
                    class="grid place-items-center w-9 h-9 rounded-full text-base font-semibold shrink-0"
                    :style="{ background: `${b.color}22`, color: b.color }"
                  >
                    {{ b.short }}
                  </span>
                  <span class="flex-1 font-medium">{{ b.name }}</span>
                  <span class="font-semibold">{{
                    b.value.toLocaleString()
                  }}</span>
                </div>
                <div
                  class="h-1 rounded-sm a-bg-fill-tertiary mt-2 ml-[46px] overflow-hidden"
                >
                  <span
                    class="block h-full"
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

          <a-card title="一周登录热力">
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
