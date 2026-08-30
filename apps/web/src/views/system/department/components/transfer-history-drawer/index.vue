<script setup lang="ts">
import { App } from 'antdv-next';
import { ref, watch } from 'vue';

import type { Department, DepartmentTransfer } from '@nest-admin/shared';

import { apiDepartmentTransfers } from '@/api/departments';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import { formatDateTime } from '@/utils/format';

const props = defineProps<{
  open: boolean;
  department: Pick<Department, 'id' | 'name'> | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const { message } = App.useApp();
const loading = ref(false);
const list = ref<DepartmentTransfer[]>([]);
const page = ref(1);
const pageSize = 10;
const total = ref(0);
let requestSequence = 0;

watch(
  () => [props.open, props.department?.id] as const,
  ([open]) => {
    requestSequence += 1;
    loading.value = false;
    list.value = [];
    total.value = 0;
    if (!open || !props.department) return;
    page.value = 1;
    void load();
  },
);

async function load(): Promise<void> {
  const departmentId = props.department?.id;
  if (!departmentId) return;

  const ticket = ++requestSequence;
  loading.value = true;
  try {
    const result = await apiDepartmentTransfers(departmentId, {
      page: page.value,
      pageSize,
    });
    if (ticket !== requestSequence) return;
    list.value = result.list;
    total.value = result.total;
  } catch (error) {
    if (ticket !== requestSequence) return;
    void message.error(error instanceof Error ? error.message : '迁移记录加载失败');
  } finally {
    if (ticket === requestSequence) loading.value = false;
  }
}

function changePage(current: number): void {
  page.value = current;
  void load();
}

function parentName(name: string | null): string {
  return name ?? '顶级部门';
}
</script>

<template>
  <a-drawer
    :open="open"
    :title="department ? `${department.name} · 迁移记录` : '迁移记录'"
    size="560px"
    destroy-on-hidden
    @update:open="emit('update:open', $event)"
  >
    <a-spin :spinning="loading">
      <div v-if="list.length > 0" class="min-h-40">
        <article
          v-for="item in list"
          :key="item.id"
          class="relative ml-2 border-0 border-l border-solid a-border-border-secondary pb-7 pl-7 last:pb-0"
        >
          <span
            class="absolute -left-2 top-0 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-white"
          >
            <AppIcon icon="i-ri:git-commit-line" class="text-xs" />
          </span>

          <div class="flex flex-wrap items-center gap-2 font-medium a-color-text">
            <span>{{ parentName(item.fromParentName) }}</span>
            <AppIcon
              icon="i-ri:arrow-right-line"
              class="a-color-text-tertiary"
            />
            <span class="text-primary">{{ parentName(item.toParentName) }}</span>
          </div>
          <p class="mb-0 mt-2 break-words text-sm a-color-text-secondary">
            {{ item.reason }}
          </p>
          <div
            class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs a-color-text-tertiary"
          >
            <span class="inline-flex items-center gap-1">
              <AppIcon icon="i-ri:user-3-line" />
              {{ item.operatorName ?? '系统操作' }}
            </span>
            <span class="inline-flex items-center gap-1">
              <AppIcon icon="i-ri:time-line" />
              {{ formatDateTime(item.createdAt) }}
            </span>
          </div>
        </article>
      </div>
      <a-empty v-else-if="!loading" description="暂无迁移记录" />
    </a-spin>

    <div v-if="total > pageSize" class="mt-6 flex justify-end">
      <a-pagination
        :current="page"
        :page-size="pageSize"
        :total="total"
        :show-size-changer="false"
        size="small"
        @change="changePage"
      />
    </div>
  </a-drawer>
</template>
