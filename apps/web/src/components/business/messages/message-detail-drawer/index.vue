<script setup lang="ts">
import type { NoticeMessage } from '@nest-admin/shared';

import AppTag from '@/components/core/base/app-tag/index.vue';
import {
  NOTICE_PRIORITY_META,
  NOTICE_TYPE_META,
} from '@/constants/dicts';
import { formatDateTime } from '@/utils/format';

defineOptions({ name: 'MessageDetailDrawer' });

defineProps<{
  open: boolean;
  message: NoticeMessage | null;
  loading?: boolean;
}>();

defineEmits<{
  'update:open': [value: boolean];
}>();
</script>

<template>
  <a-drawer
    :open="open"
    title="消息详情"
    :size="620"
    destroy-on-hidden
    @update:open="$emit('update:open', $event)"
  >
    <a-skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <article v-else-if="message" class="min-w-0">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <AppTag :tone="NOTICE_TYPE_META[message.type].tone">
          {{ NOTICE_TYPE_META[message.type].label }}
        </AppTag>
        <AppTag :tone="NOTICE_PRIORITY_META[message.priority].tone">
          {{ NOTICE_PRIORITY_META[message.priority].label }}
        </AppTag>
      </div>
      <h2 class="m-0 text-xl font-semibold a-color-text">
        {{ message.title }}
      </h2>
      <div class="mt-2 text-sm a-color-text-tertiary">
        {{ message.publisherName ?? '系统' }} ·
        {{ formatDateTime(message.publishedAt) }}
      </div>
      <div class="my-5 border-t border-solid a-border-border-secondary" />
      <div class="whitespace-pre-wrap break-words leading-7 a-color-text">
        {{ message.content }}
      </div>
    </article>
  </a-drawer>
</template>
