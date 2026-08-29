<script setup lang="ts">
import { message } from 'antdv-next';
import type { TableColumnsType } from 'antdv-next';
import dayjs from 'dayjs';
import { onMounted, ref } from 'vue';

import { PERMISSIONS } from '@nest-admin/shared';

import {
  apiLogCleanup,
  apiLogCleanupPreview,
  apiLogPage,
  type LogQuery,
} from '@/api/logs';
import type { OperationLog } from '@nest-admin/shared';
import { useTable } from '@/composables/use-table';
import { OPERATION_STATUS_META } from '@/constants/dicts';
import { formatDateTime } from '@/utils/format';

/** 列定义用 :columns + #bodyCell：a-table-column 的 #default 在 antdv-next 是嵌套列语法 */
const columns: TableColumnsType<OperationLog> = [
  { title: '时间', key: 'createdAt', width: 170 },
  { title: '操作人', dataIndex: 'username', width: 110 },
  { title: '模块', dataIndex: 'module', width: 110 },
  { title: '操作', dataIndex: 'action', width: 130 },
  { title: '请求', key: 'request', ellipsis: true },
  { title: '结果', key: 'status', width: 90 },
  { title: '耗时', key: 'duration', width: 90 },
  { title: '', key: 'detail', width: 80 },
];

const {
  filters,
  list,
  loading,
  pagination,
  run,
  search,
} = useTable<OperationLog, LogQuery>({
  fetcher: (query) => apiLogPage(query),
  filters: { username: '', module: '', status: '', startAt: undefined, endAt: undefined },
});

onMounted(() => {
  void run();
});

/** range-picker 用 valueFormat 拿到的是字符串，无需 dayjs 对象 */
const range = ref<[string, string] | null>(null);

function applyRange(): void {
  if (range.value) {
    // 截止时间取当天末尾：后端 IsDate 收 ISO 8601，
    // 直接传 2026-08-29 会漏掉当天的日志
    filters.startAt = dayjs(range.value[0]).startOf('day').toISOString();
    filters.endAt = dayjs(range.value[1]).endOf('day').toISOString();
  } else {
    filters.startAt = undefined;
    filters.endAt = undefined;
  }
}

function resetFilters(): void {
  filters.username = '';
  filters.module = '';
  filters.status = '';
  range.value = null;
  applyRange();
  void search();
}

// ---- 详情抽屉 ----

const drawerOpen = ref(false);
const current = ref<OperationLog | null>(null);

/**
 * 详情直接展示列表行自带的数据：列表接口返回的就是完整日志行，
 * 再去调 GET /operation-logs/:id 不会有任何增量信息，只是多一次往返。
 */
function openDetail(record: OperationLog): void {
  current.value = record;
  drawerOpen.value = true;
}

/** params 是后端脱敏后的 JSON 字符串，尽量格式化；解析失败就原样展示 */
function prettyPrint(raw: string | null): string {
  if (!raw) {
    return '';
  }

  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// ---- 手动清理 ----

const cleanupOpen = ref(false);
const cleanupPreview = ref<{ operationLogs: number; refreshTokens: number } | null>(null);
const cleanupBusy = ref(false);

async function openCleanup(): Promise<void> {
  cleanupOpen.value = true;
  cleanupPreview.value = null;
  cleanupPreview.value = await apiLogCleanupPreview();
}

async function runCleanup(): Promise<void> {
  cleanupBusy.value = true;
  try {
    const result = await apiLogCleanup();
    void message.success(`已清理 ${result.operationLogs} 条日志、${result.refreshTokens} 个过期令牌`);
    cleanupOpen.value = false;
    await run();
  } finally {
    cleanupBusy.value = false;
  }
}
</script>

<template>
  <a-card>
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <a-input
        v-model:value="filters.username"
        class="w-40"
        placeholder="操作人"
        allow-clear
        @press-enter="search()"
      />
      <a-input
        v-model:value="filters.module"
        class="w-40"
        placeholder="模块，如「用户管理」"
        allow-clear
        @press-enter="search()"
      />
      <a-select
        v-model:value="filters.status"
        class="w-28"
        placeholder="结果"
        allow-clear
        :options="[
          { label: '成功', value: 'success' },
          { label: '失败', value: 'failure' },
        ]"
      />
      <a-range-picker v-model:value="range" value-format="YYYY-MM-DD" @change="applyRange" />
      <a-button type="primary" @click="search()">查询</a-button>
      <a-button @click="resetFilters">重置</a-button>

      <a-button
        v-permission="PERMISSIONS.LOG_CLEAN"
        class="ml-auto"
        danger
        @click="openCleanup"
      >
        清理过期日志
      </a-button>
    </div>

    <a-table
      row-key="id"
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
    >
      <template #bodyCell="{ column, record }: { column: { key: string }; record: OperationLog }">
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTime(record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'request'">
          <span class="font-mono text-xs">
            {{ record.method }} {{ record.path }}
          </span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="OPERATION_STATUS_META[record.status].color">
            {{ OPERATION_STATUS_META[record.status].label }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'duration'">
          {{ record.durationMs === null ? '—' : `${record.durationMs}ms` }}
        </template>
        <template v-else-if="column.key === 'detail'">
          <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
        </template>
      </template>
    </a-table>

    <!-- 详情 -->
    <a-drawer
      v-model:open="drawerOpen"
      title="日志详情"
      :width="520"
      destroy-on-hidden
    >
      <template v-if="current">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="时间">{{ formatDateTime(current.createdAt) }}</a-descriptions-item>
          <a-descriptions-item label="操作人">
            {{ current.username ?? `（未登录，userId=${current.userId ?? '无'}）` }}
          </a-descriptions-item>
          <a-descriptions-item label="模块 / 操作">
            {{ current.module ?? '—' }} / {{ current.action ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="请求">
            <span class="font-mono">{{ current.method }} {{ current.path }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="结果">
            {{ OPERATION_STATUS_META[current.status].label }}
            <span v-if="current.statusCode">（HTTP {{ current.statusCode }}）</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="current.errorMessage" label="错误信息">
            <span class="text-red-500">{{ current.errorMessage }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="IP">{{ current.ip ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="耗时">
            {{ current.durationMs === null ? '—' : `${current.durationMs}ms` }}
          </a-descriptions-item>
          <a-descriptions-item label="User-Agent">
            <span class="break-all text-xs">{{ current.userAgent ?? '—' }}</span>
          </a-descriptions-item>
        </a-descriptions>

        <template v-if="current.params">
          <h4 class="mt-4 mb-2 font-medium">请求参数（已脱敏）</h4>
          <pre class="max-h-80 overflow-auto rounded bg-gray-50 p-3 text-xs">{{ prettyPrint(current.params) }}</pre>
        </template>
      </template>
    </a-drawer>

    <!-- 清理确认 -->
    <a-modal
      v-model:open="cleanupOpen"
      title="清理过期日志"
      :confirm-loading="cleanupBusy"
      ok-text="确认清理"
      @ok="runCleanup"
    >
      <template v-if="cleanupPreview">
        <p>
          按当前保留期设置，将物理删除
          <strong>{{ cleanupPreview.operationLogs }}</strong>
          条操作日志，并连带清理
          <strong>{{ cleanupPreview.refreshTokens }}</strong>
          个过期登录令牌。
        </p>
        <p class="text-xs text-gray-400">删除不可恢复；与定时任务共用同一把分布式锁，不会重复执行。</p>
      </template>
      <a-skeleton v-else active :paragraph="{ rows: 2 }" />
    </a-modal>
  </a-card>
</template>
