<script setup lang="ts">
import { App, Button } from 'antdv-next';
import type { TableColumnsType } from 'antdv-next';
import { h, ref, watch } from 'vue';

import type { NoticeMessage } from '@nest-admin/shared';

import {
  apiMessageDetail,
  apiMessagePage,
  apiMessageRead,
  apiMessageReadAll,
  type MessageQuery,
} from '@/api/notices';
import MessageDetailDrawer from '@/components/business/messages/message-detail-drawer/index.vue';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { useTable } from '@/composables/use-table';
import {
  NOTICE_PRIORITY_META,
  NOTICE_TYPE_META,
} from '@/constants/dicts';
import { useNotificationsStore } from '@/stores/notifications';
import { formatDateTime } from '@/utils/format';

const { message } = App.useApp();
const notifications = useNotificationsStore();

const current = ref<NoticeMessage | null>(null);
const drawerOpen = ref(false);
const detailLoading = ref(false);

async function openDetail(id: number): Promise<void> {
  detailLoading.value = true;
  drawerOpen.value = true;
  try {
    const detail = await apiMessageDetail(id);
    current.value = detail;
    if (!detail.readAt) {
      await apiMessageRead(id);
      current.value = { ...detail, readAt: new Date().toISOString() };
      await Promise.all([table.reload(), notifications.refreshUnreadCount()]);
    }
  } finally {
    detailLoading.value = false;
  }
}

const columns: TableColumnsType<NoticeMessage> = [
  {
    title: '状态',
    key: 'readAt',
    width: 80,
    align: 'center',
    render: (_value, record) =>
      h(AppTag, { tone: record.readAt ? 'default' : 'primary' }, () =>
        record.readAt ? '已读' : '未读',
      ),
  },
  {
    title: '类型',
    key: 'type',
    width: 90,
    render: (_value, record) =>
      h(AppTag, { tone: NOTICE_TYPE_META[record.type].tone }, () =>
        NOTICE_TYPE_META[record.type].label,
      ),
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: '优先级',
    key: 'priority',
    width: 90,
    render: (_value, record) =>
      h(AppTag, { tone: NOTICE_PRIORITY_META[record.priority].tone }, () =>
        NOTICE_PRIORITY_META[record.priority].label,
      ),
  },
  { title: '发布人', dataIndex: 'publisherName', key: 'publisherName', width: 120 },
  {
    title: '发布时间',
    key: 'publishedAt',
    width: 170,
    render: (_value, record) => formatDateTime(record.publishedAt),
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    render: (_value, record) =>
      h(
        Button,
        { type: 'link', size: 'small', onClick: () => openDetail(record.id) },
        () => '查看',
      ),
  },
];

const table = useTable<NoticeMessage, MessageQuery>({
  columns,
  filters: { readStatus: 'all' },
  fetcher: apiMessagePage,
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<MessageQuery>[] = [
  {
    label: '阅读状态',
    key: 'readStatus',
    type: 'select',
    options: [
      { label: '全部', value: 'all' },
      { label: '未读', value: 'unread' },
      { label: '已读', value: 'read' },
    ],
  },
];

async function markAllRead(): Promise<void> {
  await apiMessageReadAll();
  void message.success('已全部标记为已读');
  await Promise.all([table.reload(), notifications.refreshUnreadCount()]);
}

watch(
  () => notifications.eventRevision,
  () => void table.reload(),
);

defineOptions({ name: 'MessageCenterPage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <div class="flex items-center gap-3">
          <a-button :disabled="notifications.unreadCount === 0" @click="markAllRead">
            全部标为已读
          </a-button>
          <span class="text-sm a-color-text-tertiary">
            {{ notifications.unreadCount }} 条未读
          </span>
        </div>
      </template>
    </ProTable>

    <MessageDetailDrawer
      v-model:open="drawerOpen"
      :message="current"
      :loading="detailLoading"
    />
  </section>
</template>
