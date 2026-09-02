<script setup lang="ts">
import { App, Button } from 'antdv-next';
import dayjs from 'dayjs';
import { h, ref, watch } from 'vue';

import type { LoginLog } from '@nest-admin/shared';

import { apiLoginLogPage, type LoginLogQuery } from '@/api/logs';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { useTable } from '@/composables/use-table';
import { LOGIN_STATUS_META } from '@/constants/dicts';
import { formatDateTime } from '@/utils/format';

const { message } = App.useApp();

const table = useTable<LoginLog, LoginLogQuery>({
  columns: [
    {
      title: '登录时间',
      key: 'createdAt',
      width: 170,
      render: (_value, record) => formatDateTime(record.createdAt),
    },
    { title: '用户名', dataIndex: 'username', width: 140 },
    {
      title: '结果',
      key: 'status',
      width: 90,
      render: (_value, record) =>
        h(
          AppTag,
          { tone: LOGIN_STATUS_META[record.status].tone },
          () => LOGIN_STATUS_META[record.status].label,
        ),
    },
    {
      title: '登录 IP',
      dataIndex: 'ip',
      width: 150,
      render: (value) => value || '—',
    },
    {
      title: '失败原因',
      dataIndex: 'failureReason',
      ellipsis: true,
      render: (value) => value || '—',
    },
    {
      title: '客户端',
      dataIndex: 'userAgent',
      ellipsis: true,
      render: (value) => value || '—',
    },
    {
      title: '操作',
      key: 'detail',
      width: 80,
      fixed: 'right',
      render: (_value, record) =>
        h(
          Button,
          { type: 'link', size: 'small', onClick: () => openDetail(record) },
          () => '详情',
        ),
    },
  ],
  fetcher: (query) => apiLoginLogPage(query),
  filters: {
    username: '',
    status: '',
    startAt: undefined,
    endAt: undefined,
  },
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<LoginLogQuery>[] = [
  { label: '用户名', key: 'username' },
  {
    label: '登录结果',
    key: 'status',
    type: 'select',
    options: [
      { label: '成功', value: 'success' },
      { label: '失败', value: 'failure' },
    ],
  },
  { label: '时间范围', key: 'range', type: 'custom' },
];

const range = ref<[string, string] | null>(null);

function applyRange(): void {
  table.filters.startAt = range.value
    ? dayjs(range.value[0]).startOf('day').toISOString()
    : undefined;
  table.filters.endAt = range.value
    ? dayjs(range.value[1]).endOf('day').toISOString()
    : undefined;
}

watch(
  () => table.filters.startAt,
  (startAt) => {
    if (!startAt) range.value = null;
  },
);

const drawerOpen = ref(false);
const current = ref<LoginLog | null>(null);

function openDetail(record: LoginLog): void {
  current.value = record;
  drawerOpen.value = true;
}

defineOptions({ name: 'LoginLogPage' });
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields">
      <template #filter-range>
        <a-range-picker
          v-model:value="range"
          value-format="YYYY-MM-DD"
          @change="applyRange"
        />
      </template>
    </ProSearch>

    <ProTable :table="table" row-key="id" />

    <a-drawer
      v-model:open="drawerOpen"
      title="登录日志详情"
      :size="520"
      destroy-on-hidden
    >
      <a-descriptions v-if="current" :column="1" size="small" bordered>
        <a-descriptions-item label="登录时间">
          {{ formatDateTime(current.createdAt) }}
        </a-descriptions-item>
        <a-descriptions-item label="用户名">
          {{ current.username }}
        </a-descriptions-item>
        <a-descriptions-item label="用户 ID">
          {{ current.userId ?? '未识别' }}
        </a-descriptions-item>
        <a-descriptions-item label="登录结果">
          <AppTag :tone="LOGIN_STATUS_META[current.status].tone">
            {{ LOGIN_STATUS_META[current.status].label }}
          </AppTag>
        </a-descriptions-item>
        <a-descriptions-item v-if="current.failureReason" label="失败原因">
          <span class="text-error">{{ current.failureReason }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="登录 IP">
          {{ current.ip ?? '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="User-Agent">
          <span class="break-all text-xs">{{ current.userAgent ?? '—' }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </div>
</template>
