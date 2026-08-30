<script setup lang="ts">
import { App } from 'antdv-next';
import { computed, onBeforeUnmount, ref } from 'vue';

import type { BasicUser } from '@nest-admin/shared';

import { apiUserPage } from '@/api/users';

defineOptions({ name: 'UserSelect', inheritAttrs: false });

interface UserSelectOption {
  value: number;
  label: string;
  username: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: number | null;
    initialLabel?: string | null;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    modelValue: undefined,
    initialLabel: undefined,
    disabled: false,
    placeholder: '搜索用户名或昵称',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined];
}>();

const { message } = App.useApp();
const remoteUsers = ref<BasicUser[]>([]);
const loading = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let requestVersion = 0;

const options = computed<UserSelectOption[]>(() => {
  const result = remoteUsers.value.map(toOption);

  if (
    props.modelValue !== undefined &&
    props.modelValue !== null &&
    props.initialLabel &&
    !result.some((option) => option.value === props.modelValue)
  ) {
    result.unshift({
      value: props.modelValue,
      label: props.initialLabel,
      username: '',
    });
  }

  return result;
});

function toOption(user: BasicUser): UserSelectOption {
  const nickname = user.nickname?.trim();
  return {
    value: user.id,
    label: nickname || user.username,
    username: nickname ? user.username : '',
  };
}

async function loadUsers(keyword: string): Promise<void> {
  const version = ++requestVersion;
  loading.value = true;

  try {
    const result = await apiUserPage({
      page: 1,
      pageSize: 20,
      keyword: keyword || undefined,
      status: 'active',
    });
    if (version === requestVersion) remoteUsers.value = result.list;
  } catch (error) {
    if (version === requestVersion) {
      const text = error instanceof Error ? error.message : '用户列表加载失败';
      void message.error(text);
    }
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

function search(keyword: string): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(
    () => void loadUsers(keyword.trim().slice(0, 32)),
    300,
  );
}

function updateValue(value: number | undefined): void {
  emit('update:modelValue', value);
}

function handleDropdownVisible(open: boolean): void {
  if (open && remoteUsers.value.length === 0 && !loading.value) {
    void loadUsers('');
  }
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  requestVersion += 1;
});
</script>

<template>
  <a-select
    v-bind="$attrs"
    class="w-full"
    :value="modelValue ?? undefined"
    :options="options"
    :loading="loading"
    :disabled="disabled"
    :filter-option="false"
    :placeholder="placeholder"
    show-search
    allow-clear
    @update:value="updateValue"
    @search="search"
    @dropdown-visible-change="handleDropdownVisible"
  >
    <template #option="option">
      <div class="flex min-w-0 items-center justify-between gap-3 py-0.5">
        <div class="min-w-0">
          <div class="truncate a-color-text">{{ option.label }}</div>
          <div
            v-if="option.username"
            class="truncate text-xs a-color-text-tertiary"
          >
            @{{ option.username }}
          </div>
        </div>
      </div>
    </template>
  </a-select>
</template>
