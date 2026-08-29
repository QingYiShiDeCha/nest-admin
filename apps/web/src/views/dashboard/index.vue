<script setup lang="ts">
import { computed } from 'vue';

import AppIcon from '@/components/core/base/app-icon/index.vue';
import {
  BarChart,
  HeatmapChart,
  PieChart,
  type HeatmapChartDatum,
} from '@/components/core/charts';
import { SEMANTIC_COLORS } from '@/constants/palette';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();

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

/** 顶部四张统计卡 */
const statCards = [
  {
    icon: 'i-ri:user-3-line',
    tint: 'blue',
    label: '总访客数',
    value: '48,260',
    trend: '1.18%',
    up: true,
  },
  {
    icon: 'i-ri:message-3-line',
    tint: 'cyan',
    label: '总会话数',
    value: '156K',
    trend: '3.04%',
    up: true,
  },
  {
    icon: 'i-ri:pulse-line',
    tint: 'green',
    label: '跳出率',
    value: '38.2%',
    trend: '1.12%',
    up: false,
  },
  {
    icon: 'i-ri:time-line',
    tint: 'orange',
    label: '平均会话时长',
    value: '4分12秒',
    trend: '0.84%',
    up: true,
  },
];

/** 终端会话占比：分段比例与底部分类统计一致，中心是总量 */
const deviceSegments = [
  { label: '手机', value: 1842, color: 'var(--dash-blue)' },
  { label: '平板', value: 1026, color: 'var(--dash-green)' },
  { label: '桌面端', value: 1364, color: 'var(--dash-orange)' },
];
const deviceTotal = deviceSegments.reduce((sum, s) => sum + s.value, 0);
const deviceChartData = deviceSegments.map((segment) => ({
  name: segment.label,
  value: segment.value,
}));

/** 近 12 个月柱状图（0-50 刻度），值取自参考图目测比例 */
const monthBars = [24, 12, 23, 29, 14, 23, 40, 22, 47, 23, 48, 38];
const monthLabels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
const audienceSeries = [{ name: '访客数', data: monthBars }];

const browsers = [
  { name: 'Chrome', alias: '谷歌浏览器', value: 1428, color: '#4080ff' },
  { name: 'Edge', alias: '微软浏览器', value: 1102, color: '#0ea5a4' },
  { name: 'Safari', alias: '苹果浏览器', value: 864, color: '#f59e0b' },
  { name: 'Firefox', alias: '火狐浏览器', value: 934, color: '#f43f5e' },
  { name: 'Opera', alias: '欧朋浏览器', value: 712, color: '#e11d48' },
  { name: '夸克', alias: 'UC 浏览器', value: 798, color: '#8b5cf6' },
];
const browserMax = Math.max(...browsers.map((b) => b.value));

const countries = [
  { code: 'US', name: '美国', flag: '🇺🇸', trend: 2.15, visitors: '45,860' },
  { code: 'AR', name: '阿根廷', flag: '🇦🇷', trend: 1.62, visitors: '12,680' },
  { code: 'DE', name: '德国', flag: '🇩🇪', trend: -0.51, visitors: '9,032' },
  { code: 'FR', name: '法国', flag: '🇫🇷', trend: 1.44, visitors: '6,086' },
];

const activities = [
  { owner: '陈晨', dept: '品牌合作', amount: '¥ 12,465', target: '23.3%' },
  { owner: '李娜', dept: '渠道运营', amount: '¥ 8,930', target: '41.7%' },
];

/** 热力图使用确定性数据，避免每次渲染时随机闪动 */
const heatLabels = ['12时', '19时', '15时', '0时', '8时', '4时'];
const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const heatData = heatLabels.flatMap((_, row) =>
  weekdayLabels.map((__, col): HeatmapChartDatum => {
    const seed =
      Math.sin((row + 1) * 12.9898 + (col + 1) * 78.233) * 43758.5453;
    return [col, row, Math.round((seed - Math.floor(seed)) * 100)];
  }),
);

defineOptions({ name: 'DashboardPage' });
</script>

<template>
  <div class="dash" :style="themeVars">
    <!-- 左主体 + 右通栏 -->
    <div class="dash-board">
      <div class="dash-main">
        <!-- 统计卡行 -->
        <div class="dash-stats">
          <div
            v-for="card in statCards"
            :key="card.label"
            class="panel stat-card"
          >
            <div class="stat-icon" :class="`tint-${card.tint}`">
              <AppIcon :icon="card.icon" />
            </div>
            <div class="stat-meta">
              <div class="stat-label">{{ card.label }}</div>
              <div class="stat-value">{{ card.value }}</div>
              <div class="stat-trend" :class="card.up ? 'up' : 'down'">
                {{ card.up ? '↑' : '↓' }} {{ card.trend }} 本年
              </div>
            </div>
          </div>
        </div>

        <!-- 环形图 + 柱状图，约 1 : 2.5 -->
        <div class="dash-split">
          <a-card title="终端会话占比" class="dash-card">
            <template #extra>
              <a class="card-link">查看详情</a>
            </template>
            <PieChart
              class="h-60 w-full"
              :data="deviceChartData"
              :center-value="deviceTotal.toLocaleString()"
              inner-radius="66%"
              outer-radius="86%"
              aria-label="终端会话占比"
            />
            <div class="donut-stats">
              <div v-for="seg in deviceSegments" :key="seg.label">
                <div class="donut-num">{{ seg.value }}</div>
                <div class="donut-label">
                  <span class="dot" :style="{ background: seg.color }" />
                  {{ seg.label }}
                </div>
              </div>
            </div>
          </a-card>

          <a-card
            title="受众趋势"
            class="dash-card min-h-80 flex flex-col [&_.ant-card-body]:flex [&_.ant-card-body]:flex-1 [&_.ant-card-body]:min-h-0"
          >
            <template #extra>
              <a class="card-link">查看详情</a>
            </template>
            <BarChart
              class="min-h-60 w-full flex-1"
              :categories="monthLabels"
              :series="audienceSeries"
              :y-axis-max="50"
              :y-axis-interval="10"
              aria-label="近十二个月受众趋势"
            />
          </a-card>
        </div>

        <!-- 两个表格，同上列宽 -->
        <div class="dash-split">
          <a-card title="访客国家分布" class="dash-card">
            <template #extra>
              <a class="card-link">查看详情</a>
            </template>
            <table class="mini-table">
              <thead>
                <tr>
                  <th class="w-12">序号</th>
                  <th>国家</th>
                  <th class="ta-r">访客数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, i) in countries" :key="c.code">
                  <td class="w-12">{{ i + 1 }}</td>
                  <td>
                    <span class="flag">{{ c.flag }}</span>
                    <span class="code">{{ c.code }}</span>
                    {{ c.name }}
                  </td>
                  <td class="ta-r">
                    <span :class="c.trend >= 0 ? 'trend-up' : 'trend-down'">
                      ({{ c.trend >= 0 ? '↑' : '↓' }}
                      {{ Math.abs(c.trend).toFixed(2) }}%)
                    </span>
                    {{ c.visitors }}
                  </td>
                </tr>
              </tbody>
            </table>
          </a-card>

          <a-card title="热门活动列表" class="dash-card">
            <template #extra>
              <a class="card-link">查看全部</a>
            </template>
            <table class="mini-table">
              <thead>
                <tr>
                  <th>负责人</th>
                  <th>销售额</th>
                  <th>目标</th>
                  <th>状态</th>
                  <th class="ta-r">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="act in activities" :key="act.owner">
                  <td>
                    <a-avatar :size="32" class="owner-avatar">{{
                      act.owner[0]
                    }}</a-avatar>
                    <span class="owner-name">{{ act.owner }}</span>
                    <span class="owner-dept">{{ act.dept }}</span>
                  </td>
                  <td>{{ act.amount }}</td>
                  <td>
                    <a class="card-link">{{ act.target }}</a>
                  </td>
                  <td><a-tag color="processing">进行中</a-tag></td>
                  <td class="ta-r">
                    <a-space :size="4">
                      <a-button type="text" size="small">
                        <AppIcon icon="i-ri:edit-line" />
                      </a-button>
                      <a-button type="text" size="small" danger>
                        <AppIcon icon="i-ri:delete-bin-line" />
                      </a-button>
                    </a-space>
                  </td>
                </tr>
              </tbody>
            </table>
          </a-card>
        </div>
      </div>

      <!-- 右通栏：不参与左侧分行 -->
      <div class="dash-rail">
        <a-card title="浏览器使用洞察" class="dash-card">
          <ul class="browser-list">
            <li v-for="b in browsers" :key="b.name">
              <div class="browser-row">
                <span
                  class="browser-avatar"
                  :style="{ background: `${b.color}22`, color: b.color }"
                >
                  {{ b.name[0] }}
                </span>
                <span class="browser-name">
                  {{ b.name }}
                  <small>{{ b.alias }}</small>
                </span>
                <span class="browser-value">{{
                  b.value.toLocaleString()
                }}</span>
              </div>
              <div class="browser-bar">
                <span
                  :style="{
                    width: `${(b.value / browserMax) * 100}%`,
                    background: b.color,
                  }"
                />
              </div>
            </li>
          </ul>
        </a-card>

        <a-card title="一周活跃时段" class="dash-card">
          <HeatmapChart
            class="h-60 w-full"
            :x-labels="weekdayLabels"
            :y-labels="heatLabels"
            :data="heatData"
            :max="100"
            aria-label="一周活跃时段"
          />
        </a-card>
      </div>
    </div>
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

/* 左主体内部 1 : 2.5 双列，多行复用同一列宽 */
.dash-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.5fr);
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

.card-link {
  font-size: 13px;
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
.flag {
  margin-right: 6px;
}
.code {
  color: var(--dash-text-secondary);
  margin-right: 6px;
  font-size: 12px;
}
.trend-up {
  color: var(--dash-green);
  margin-right: 6px;
  font-size: 12px;
}
.trend-down {
  color: var(--dash-danger);
  margin-right: 6px;
  font-size: 12px;
}
.owner-avatar {
  background: color-mix(in srgb, var(--dash-blue) 12%, var(--dash-container));
  color: var(--dash-blue);
  margin-right: 8px;
  vertical-align: middle;
}
.owner-name {
  vertical-align: middle;
  margin-right: 8px;
}
.owner-dept {
  color: var(--dash-text-secondary);
  font-size: 12px;
  vertical-align: middle;
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
.browser-name small {
  display: block;
  font-weight: 400;
  color: var(--dash-text-secondary);
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
  .dash-split {
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
