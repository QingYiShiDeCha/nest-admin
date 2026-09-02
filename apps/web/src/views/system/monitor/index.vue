<script setup lang="ts">
import { App, Button, Card, Statistic } from 'antdv-next';
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue';

import type {
  SystemMonitorOverview,
  SystemServiceProbe,
  SystemServiceStatus,
} from '@nest-admin/shared';

import { apiSystemMonitorOverview } from '@/api/system-monitor';
import AppTag from '@/components/core/base/app-tag/index.vue';
import { LineChart } from '@/components/core/charts';
import { usePageRefresh } from '@/composables/use-page-refresh';
import { formatDateTime } from '@/utils/format';

const { message } = App.useApp();
const overview = ref<SystemMonitorOverview | null>(null);
const loading = ref(false);
const errorMessage = ref('');
let pollingTimer: ReturnType<typeof setInterval> | null = null;

const serviceStatusMeta: Record<
  SystemServiceStatus,
  { label: string; tone: 'success' | 'error' | 'warning' }
> = {
  up: { label: '正常', tone: 'success' },
  down: { label: '异常', tone: 'error' },
  unconfigured: { label: '未配置', tone: 'warning' },
};

function serviceStatus(service: SystemServiceProbe) {
  return serviceStatusMeta[service.status];
}

const chartCategories = computed(() =>
  (overview.value?.history ?? []).map((item) =>
    new Date(item.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  ),
);

const chartSeries = computed(() => {
  const history = overview.value?.history ?? [];
  return [
    {
      name: '进程 CPU',
      data: history.map((item) => item.cpuUsagePercent),
    },
    {
      name: '堆内存',
      data: history.map((item) => item.heapUsagePercent),
    },
    {
      name: '主机内存',
      data: history.map((item) => item.hostMemoryUsagePercent),
    },
  ];
});

const latestMetric = computed(() => {
  const history = overview.value?.history ?? [];
  return history[history.length - 1];
});

const memoryUsagePercent = computed(() => {
  const item = overview.value;
  if (!item || item.host.totalMemoryBytes <= 0) return 0;
  return (
    ((item.host.totalMemoryBytes - item.host.freeMemoryBytes) /
      item.host.totalMemoryBytes) *
    100
  );
});

async function loadOverview(): Promise<void> {
  if (loading.value) return;

  loading.value = true;
  errorMessage.value = '';
  try {
    overview.value = await apiSystemMonitorOverview();
  } catch (error) {
    const text = error instanceof Error ? error.message : '监控数据加载失败';
    errorMessage.value = text;
    if (overview.value) void message.error(text);
  } finally {
    loading.value = false;
  }
}

function startPolling(): void {
  if (pollingTimer !== null) return;
  void loadOverview();
  pollingTimer = setInterval(() => void loadOverview(), 30_000);
}

function stopPolling(): void {
  if (pollingTimer === null) return;
  clearInterval(pollingTimer);
  pollingTimer = null;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatSeconds(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  return `${minutes}分钟`;
}

usePageRefresh(loadOverview);
onMounted(startPolling);
onActivated(startPolling);
onDeactivated(stopPolling);
onUnmounted(stopPolling);

defineOptions({ name: 'SystemMonitorPage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="m-0 text-lg font-semibold a-color-text">系统监控</h2>
        <p class="m-0 mt-1 text-sm a-color-text-secondary">
          查看当前实例运行状态与短期负载趋势
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="overview" class="text-xs a-color-text-tertiary">
          更新于 {{ formatDateTime(overview.generatedAt) }}
        </span>
        <Button :loading="loading" @click="loadOverview">
          <template #icon><i class="i-ri:refresh-line" /></template>
          刷新
        </Button>
      </div>
    </div>

    <Card v-if="errorMessage && !overview" :bordered="true">
      <div class="flex flex-col items-center gap-3 py-10">
        <i class="i-ri:cloud-off-line text-4xl text-error" />
        <span class="a-color-text-secondary">{{ errorMessage }}</span>
        <Button type="primary" @click="loadOverview">重新加载</Button>
      </div>
    </Card>

    <template v-else-if="overview">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card :bordered="true" class="min-w-0">
          <Statistic title="在线会话" :value="overview.workload.onlineSessions ?? 0" />
          <div class="mt-2 text-xs a-color-text-tertiary">
            当前未吊销且未过期的登录设备
          </div>
        </Card>
        <Card :bordered="true" class="min-w-0">
          <Statistic
            title="定时任务"
            :value="overview.workload.activeScheduledTasks ?? 0"
            :suffix="` / ${overview.workload.scheduledTasks ?? '—'}`"
          />
          <div class="mt-2 text-xs a-color-text-tertiary">启用计划 / 全部计划</div>
        </Card>
        <Card :bordered="true" class="min-w-0">
          <Statistic
            title="进程 CPU"
            :value="latestMetric?.cpuUsagePercent ?? 0"
            suffix="%"
            :precision="1"
          />
          <div class="mt-2 text-xs a-color-text-tertiary">按 CPU 核心数归一化</div>
        </Card>
        <Card :bordered="true" class="min-w-0">
          <Statistic
            title="主机内存"
            :value="memoryUsagePercent"
            suffix="%"
            :precision="1"
          />
          <div class="mt-2 text-xs a-color-text-tertiary">
            {{ formatBytes(overview.host.totalMemoryBytes) }} 总内存
          </div>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card :bordered="true" title="运行趋势">
          <template #extra>
            <span class="text-xs a-color-text-tertiary">最近 20 次采样</span>
          </template>
          <LineChart
            :categories="chartCategories"
            :series="chartSeries"
            :height="280"
            :y-axis-max="100"
            :y-axis-interval="25"
            aria-label="系统 CPU 与内存使用趋势"
          />
        </Card>

        <Card :bordered="true" title="依赖状态">
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between border-b border-solid a-border-border-secondary pb-3">
              <div class="flex items-center gap-3">
                <i class="i-ri:database-2-line text-xl text-primary" />
                <div>
                  <div class="font-medium a-color-text">MySQL</div>
                  <div class="text-xs a-color-text-tertiary">业务数据库</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs a-color-text-tertiary">
                  {{ overview.services.database.latencyMs === null ? '—' : `${overview.services.database.latencyMs}ms` }}
                </span>
                <AppTag :tone="serviceStatus(overview.services.database).tone">
                  {{ serviceStatus(overview.services.database).label }}
                </AppTag>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <i class="i-ri:database-line text-xl text-primary" />
                <div>
                  <div class="font-medium a-color-text">Redis</div>
                  <div class="text-xs a-color-text-tertiary">缓存与实时传播</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs a-color-text-tertiary">
                  {{ overview.services.redis.latencyMs === null ? '—' : `${overview.services.redis.latencyMs}ms` }}
                </span>
                <AppTag :tone="serviceStatus(overview.services.redis).tone">
                  {{ serviceStatus(overview.services.redis).label }}
                </AppTag>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card :bordered="true" title="主机信息">
          <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs a-color-text-tertiary">主机名</dt>
              <dd class="m-0 mt-1 truncate font-medium a-color-text" :title="overview.host.hostname">
                {{ overview.host.hostname }}
              </dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">平台</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ overview.host.platform }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">处理器</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ overview.host.cpuCount }} 核 / {{ overview.host.arch }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">主机运行时间</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ formatSeconds(overview.host.uptimeSeconds) }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">内存占用</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ formatBytes(overview.host.totalMemoryBytes - overview.host.freeMemoryBytes) }} / {{ formatBytes(overview.host.totalMemoryBytes) }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">可用内存</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ formatBytes(overview.host.freeMemoryBytes) }}</dd>
            </div>
          </dl>
        </Card>

        <Card :bordered="true" title="Node.js 进程">
          <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs a-color-text-tertiary">进程 ID</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ overview.process.pid }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">Node.js</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ overview.process.nodeVersion }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">进程运行时间</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ formatSeconds(overview.process.uptimeSeconds) }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">堆内存</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ formatBytes(overview.process.heapUsedBytes) }} / {{ formatBytes(overview.process.heapTotalBytes) }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">常驻内存</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ formatBytes(overview.process.rssBytes) }}</dd>
            </div>
            <div>
              <dt class="text-xs a-color-text-tertiary">执行中任务</dt>
              <dd class="m-0 mt-1 font-medium a-color-text">{{ overview.workload.runningTaskExecutions ?? '—' }}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </template>

    <Card v-else :bordered="true">
      <div class="flex items-center justify-center py-16">
        <a-spin tip="正在加载监控数据" />
      </div>
    </Card>
  </section>
</template>
