<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

import type { TabItem } from '@/stores/tabs';
import { useTabsStore } from '@/stores/tabs';

const route = useRoute();
const router = useRouter();
const tabs = useTabsStore();

function isActive(tab: TabItem): boolean {
  return tab.path === route.fullPath;
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
  <div class="flex items-center gap-2 px-6 h-10">
    <div class="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        v-for="tab in tabs.tabs"
        :key="tab.path"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[#e5e6eb] rounded text-13px leading-20px whitespace-nowrap cursor-pointer shrink-0 transition-colors"
        :class="
          isActive(tab)
            ? 'text-primary border-primary bg-[color-mix(in_srgb,var(--ant-color-primary)_10%,#fff)]'
            : 'bg-white text-[#4e5969] hover:text-primary'
        "
        type="button"
        @click="open(tab)"
      >
        <i v-if="tab.iconClass" :class="tab.iconClass" />
        <span class="max-w-30 truncate">{{ tab.title }}</span>
        <span
          v-if="!tab.affix"
          class="inline-grid place-items-center w-4 h-4 rounded-[3px] text-10px hover:bg-[#f53f3f] hover:text-white"
          title="关闭"
          @click.stop="handleClose(tab)"
        >
          <i class="i-ant-design:close-outlined" />
        </span>
      </button>
    </div>

    <a-dropdown :trigger="['click']" :menu="{ items: moreItems, onClick: handleMore }">
      <button
        class="inline-grid place-items-center w-7 h-7 border border-[#e5e6eb] rounded bg-white text-[#4e5969] text-12px cursor-pointer shrink-0"
        type="button"
        title="标签操作"
      >
        <i class="i-ant-design:down-outlined" />
      </button>
    </a-dropdown>
  </div>
</template>
