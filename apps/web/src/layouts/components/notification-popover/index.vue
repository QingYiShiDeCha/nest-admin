<script setup lang="ts">
import { App } from 'antdv-next';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { NoticeMessage } from '@nest-admin/shared';

import {
  apiMessageDetail,
  apiMessageRead,
  apiMessageReadAll,
  apiRecentMessages,
} from '@/api/notices';
import MessageDetailDrawer from '@/components/business/messages/message-detail-drawer/index.vue';
import AppTag from '@/components/core/base/app-tag/index.vue';
import { NOTICE_PRIORITY_META } from '@/constants/dicts';
import { useNotificationsStore } from '@/stores/notifications';
import { formatDateTime } from '@/utils/format';

defineOptions({ name: 'NotificationPopover' });

const { message } = App.useApp();
const router = useRouter();
const notifications = useNotificationsStore();
const open = ref(false);
const loading = ref(false);
const recent = ref<NoticeMessage[]>([]);
const current = ref<NoticeMessage | null>(null);
const drawerOpen = ref(false);
const detailLoading = ref(false);

async function loadRecent(): Promise<void> {
  loading.value = true;
  try {
    recent.value = await apiRecentMessages();
  } catch (error) {
    void message.error(error instanceof Error ? error.message : '消息加载失败');
  } finally {
    loading.value = false;
  }
}

function handleOpenChange(value: boolean): void {
  open.value = value;
  if (value) void loadRecent();
}

async function openMessage(item: NoticeMessage): Promise<void> {
  open.value = false;
  drawerOpen.value = true;
  detailLoading.value = true;

  try {
    const detail = await apiMessageDetail(item.id);
    current.value = detail;

    if (!detail.readAt) {
      await apiMessageRead(item.id);
      const readAt = new Date().toISOString();
      current.value = { ...detail, readAt };
      recent.value = recent.value.map((messageItem) =>
        messageItem.id === item.id
          ? { ...messageItem, readAt }
          : messageItem,
      );
      await notifications.refreshUnreadCount();
    }
  } catch (error) {
    drawerOpen.value = false;
    void message.error(error instanceof Error ? error.message : '消息加载失败');
  } finally {
    detailLoading.value = false;
  }
}

async function markAllRead(): Promise<void> {
  await apiMessageReadAll();
  recent.value = recent.value.map((item) => ({
    ...item,
    readAt: item.readAt ?? new Date().toISOString(),
  }));
  await notifications.refreshUnreadCount();
  void message.success('已全部标记为已读');
}

async function openAll(): Promise<void> {
  open.value = false;
  await router.push('/messages');
}

watch(
  () => notifications.eventRevision,
  () => {
    if (open.value) void loadRecent();
  },
);

onMounted(() => notifications.startRealtime());
onBeforeUnmount(() => notifications.stopRealtime());
</script>

<template>
  <span class="inline-flex">
    <a-popover
      :open="open"
      placement="bottomRight"
      trigger="click"
      :overlay-inner-style="{ padding: 0 }"
      @open-change="handleOpenChange"
    >
      <button
        class="w-9 h-9 inline-grid place-items-center border-none rounded-md bg-transparent text-xl a-color-text cursor-pointer transition-colors hover:a-bg-fill-secondary"
        type="button"
        title="消息通知"
        aria-label="打开消息通知"
      >
        <a-badge
          :count="notifications.unreadCount"
          :overflow-count="99"
          size="small"
        >
          <i class="i-ri:notification-3-line a-color-text text-xl" />
        </a-badge>
      </button>

      <template #content>
        <div class="w-90 max-w-[calc(100vw-30px)]">
          <div class="h-12 px-4 flex items-center justify-between border-b border-solid a-border-border-secondary">
            <span class="font-medium a-color-text">消息通知</span>
            <a-button
              v-if="notifications.unreadCount > 0"
              type="link"
              size="small"
              @click="markAllRead"
            >
              全部已读
            </a-button>
          </div>

          <div v-if="loading" class="p-4">
            <a-skeleton active :paragraph="{ rows: 3 }" />
          </div>
          <div
            v-else-if="recent.length === 0"
            class="h-40 flex flex-col items-center justify-center gap-2 a-color-text-tertiary"
          >
            <i class="i-ri:inbox-2-line text-3xl" />
            <span class="text-sm">暂无消息</span>
          </div>
          <div v-else class="max-h-90 overflow-y-auto">
            <button
              v-for="item in recent"
              :key="item.id"
              type="button"
              class="w-full px-4 py-3 flex gap-3 text-left border-none border-b border-solid a-border-border-secondary a-bg-container cursor-pointer hover:a-bg-fill-secondary"
              @click="openMessage(item)"
            >
              <span
                class="mt-2 w-2 h-2 rounded-full shrink-0"
                :class="item.readAt ? 'a-bg-fill' : 'bg-primary'"
              />
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span class="truncate text-sm font-medium a-color-text">
                    {{ item.title }}
                  </span>
                  <AppTag :tone="NOTICE_PRIORITY_META[item.priority].tone">
                    {{ NOTICE_PRIORITY_META[item.priority].label }}
                  </AppTag>
                </span>
                <span class="mt-1 block truncate text-xs a-color-text-tertiary">
                  {{ item.publisherName ?? '系统' }} ·
                  {{ formatDateTime(item.publishedAt) }}
                </span>
              </span>
            </button>
          </div>

          <button
            type="button"
            class="w-full h-11 border-none border-t border-solid a-border-border-secondary a-bg-container text-sm text-primary cursor-pointer hover:a-bg-fill-secondary"
            @click="openAll"
          >
            查看全部消息
          </button>
        </div>
      </template>
    </a-popover>

    <MessageDetailDrawer
      v-model:open="drawerOpen"
      :message="current"
      :loading="detailLoading"
    />
  </span>
</template>
