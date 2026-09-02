<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppIcon from '@/components/core/base/app-icon/index.vue';
import { useSettingsStore } from '@/stores/settings';
import { useTabsStore, type TabItem } from '@/stores/tabs';

const route = useRoute();
const router = useRouter();
const tabs = useTabsStore();
const settings = useSettingsStore();
const draggedPath = ref<string>();
const dragOverPath = ref<string>();

function isActive(tab: TabItem): boolean {
  return tab.path === route.fullPath;
}

function tabClasses(tab: TabItem): string {
  const active = isActive(tab);

  if (settings.tabStyle === 'line') {
    return active
      ? 'border-0 border-b-2 border-solid border-primary rounded-none bg-transparent text-primary'
      : 'border-0 border-b-2 border-solid border-transparent rounded-none bg-transparent a-color-text-secondary hover:text-primary hover:border-primary';
  }

  if (settings.tabStyle === 'pill') {
    return active
      ? 'border border-solid border-primary rounded-full text-primary a-bg-primary-bg'
      : 'border border-solid a-border-border rounded-full a-bg-container a-color-text-secondary hover:text-primary hover:border-primary';
  }

  return active
    ? 'border border-solid border-primary rounded text-primary a-bg-primary-bg'
    : 'border border-solid a-border-border rounded a-bg-container a-color-text-secondary hover:text-primary hover:border-primary';
}

function open(tab: TabItem): void {
  if (!isActive(tab)) {
    void router.push(tab.path);
  }
}

function handleClose(tab: TabItem): void {
  const next = tabs.close(tab.path, route.fullPath);

  if (next) {
    void router.push(next);
  }
}

function handleDragStart(event: DragEvent, tab: TabItem): void {
  if (tab.affix) {
    event.preventDefault();
    return;
  }

  draggedPath.value = tab.path;
  event.dataTransfer?.setData('text/plain', tab.path);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function handleDragOver(event: DragEvent, tab: TabItem): void {
  if (!draggedPath.value || tab.affix || draggedPath.value === tab.path) {
    return;
  }

  event.preventDefault();
  dragOverPath.value = tab.path;

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDrop(event: DragEvent, tab: TabItem): void {
  event.preventDefault();

  if (draggedPath.value && !tab.affix) {
    tabs.move(draggedPath.value, tab.path);
  }

  handleDragEnd();
}

function handleDragEnd(): void {
  draggedPath.value = undefined;
  dragOverPath.value = undefined;
}

const moreItems = [
  { key: 'close-others', label: '关闭其他标签' },
  { key: 'close-all', label: '关闭全部标签' },
];

function handleMore({ key }: { key: string | number }): void {
  const next =
    key === 'close-others'
      ? tabs.closeOthers(route.fullPath, route.fullPath)
      : tabs.closeAll(route.fullPath);

  if (next) {
    void router.push(next);
  }
}
</script>

<template>
  <div class="admin-tabbar flex items-center gap-2 h-10 px-[15px] md:px-5">
    <div
      class="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        v-for="tab in tabs.tabs"
        :key="tab.path"
        class="h-8 inline-flex items-center gap-1.5 px-3 text-sm whitespace-nowrap shrink-0 transition-[color,border-color,background-color,opacity]"
        :class="[
          tabClasses(tab),
          tab.affix ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
          draggedPath === tab.path ? 'opacity-50' : '',
          dragOverPath === tab.path ? '!border-primary' : '',
        ]"
        :draggable="!tab.affix"
        type="button"
        @click="open(tab)"
        @dragstart="handleDragStart($event, tab)"
        @dragover="handleDragOver($event, tab)"
        @dragleave="dragOverPath === tab.path && (dragOverPath = undefined)"
        @drop="handleDrop($event, tab)"
        @dragend="handleDragEnd"
      >
        <AppIcon v-if="tab.iconClass" :icon="tab.iconClass" class="text-base" />
        <span class="max-w-30 truncate">{{ tab.title }}</span>
        <span
          v-if="!tab.affix"
          class="inline-grid place-items-center w-4.5 h-4.5 rounded-[3px] text-xs hover:a-bg-error hover:text-white cursor-pointer"
          title="关闭"
          @click.stop="handleClose(tab)"
        >
          <i class="i-ri:close-line" />
        </span>
      </button>
    </div>

    <a-dropdown
      :trigger="['click']"
      :menu="{ items: moreItems, onClick: handleMore }"
    >
      <button
        class="inline-grid place-items-center w-8 h-8 border a-border-border rounded a-bg-container a-color-text-secondary text-base cursor-pointer shrink-0 hover:text-primary hover:border-primary"
        type="button"
        title="标签操作"
      >
        <i class="i-ri:arrow-down-s-line" />
      </button>
    </a-dropdown>
  </div>
</template>
