<script setup lang="ts">
import { computed, ref } from 'vue';

import AppIcon from '@/components/core/base/app-icon/index.vue';

import type { IconPickerOption } from './types';
import { filterIconOptions } from './utils';

defineOptions({ name: 'IconPicker', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    options: readonly IconPickerOption[];
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    modelValue: '',
    disabled: false,
    placeholder: '选择图标或填写图片地址',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const pickerOpen = ref(false);
const keyword = ref('');
const draftValue = ref('');

const filteredOptions = computed(() =>
  filterIconOptions(props.options, keyword.value),
);
const currentIcon = computed(
  () =>
    props.options.find((option) => option.value === props.modelValue)?.icon ??
    props.modelValue,
);

function updateValue(value: string): void {
  emit('update:modelValue', value);
}

function openPicker(): void {
  draftValue.value = props.modelValue;
  keyword.value = '';
  pickerOpen.value = true;
}

function selectIcon(value: string): void {
  draftValue.value = value;
}

function confirmSelection(): void {
  emit('update:modelValue', draftValue.value);
  pickerOpen.value = false;
}
</script>

<template>
  <div v-bind="$attrs" class="w-full">
    <div class="flex w-full items-center gap-2">
      <a-input
        :value="modelValue"
        :disabled="disabled"
        :placeholder="placeholder"
        allow-clear
        @update:value="updateValue"
      >
        <template v-if="currentIcon" #prefix>
          <AppIcon :icon="currentIcon" class="text-lg a-color-text-secondary" />
        </template>
      </a-input>
      <a-button class="shrink-0" :disabled="disabled" @click="openPicker">
        <AppIcon icon="i-ri:apps-2-line" />
        选择图标
      </a-button>
    </div>

    <a-modal
      v-model:open="pickerOpen"
      title="选择图标"
      :width="760"
      ok-text="使用此图标"
      cancel-text="取消"
      @ok="confirmSelection"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div
          class="flex flex-col gap-3 rounded-lg border border-solid a-border-border-secondary p-4 sm:flex-row sm:items-center"
        >
          <a-input
            v-model:value="keyword"
            class="min-w-0 flex-1"
            allow-clear
            placeholder="搜索名称，如 user、menu、设置"
          >
            <template #prefix>
              <AppIcon
                icon="i-ri:search-2-line"
                class="a-color-text-tertiary"
              />
            </template>
          </a-input>
          <div
            class="flex shrink-0 items-center gap-2 text-sm a-color-text-tertiary"
          >
            <span>常用 Remix Icon</span>
            <span>{{ filteredOptions.length }} / {{ options.length }}</span>
          </div>
        </div>

        <div
          class="h-96 overflow-y-auto rounded-lg border border-solid a-border-border-secondary p-4"
        >
          <div
            v-if="filteredOptions.length > 0"
            class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8"
          >
            <a-tooltip
              v-for="option in filteredOptions"
              :key="option.value"
              :title="`${option.label} · ${option.value}`"
            >
              <button
                type="button"
                class="h-20 min-w-0 rounded-lg border border-solid px-1 transition-colors duration-200"
                :class="
                  draftValue === option.value
                    ? 'border-primary a-bg-fill-secondary text-primary'
                    : 'a-border-border-secondary a-bg-container a-color-text-secondary hover:border-primary hover:a-bg-fill-tertiary hover:text-primary'
                "
                :aria-label="`选择${option.label}`"
                :aria-pressed="draftValue === option.value"
                @click="selectIcon(option.value)"
                @dblclick="confirmSelection"
              >
                <AppIcon :icon="option.icon" class="text-2xl" />
                <span class="mt-2 block truncate text-xs">{{
                  option.label
                }}</span>
              </button>
            </a-tooltip>
          </div>
          <div v-else class="flex h-full items-center justify-center">
            <a-empty description="没有匹配的图标" />
          </div>
        </div>

        <div class="flex min-h-8 items-center justify-between gap-3">
          <div class="min-w-0 truncate text-sm a-color-text-tertiary">
            当前选择：
            <span class="a-color-text">{{ draftValue || '未选择' }}</span>
          </div>
          <a-button
            v-if="draftValue"
            type="text"
            danger
            class="shrink-0"
            @click="draftValue = ''"
          >
            <AppIcon icon="i-ri:delete-bin-line" />
            清空选择
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>
