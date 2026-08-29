<script setup lang="ts">
import { theme as antdvTheme } from 'antdv-next';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { TabItem } from '@/stores/tabs';
import { useTabsStore } from '@/stores/tabs';

const route = useRoute();
const router = useRouter();
const tabs = useTabsStore();

const { token: designToken } = antdvTheme.useToken();

/** 激活页签用主题色描边/着色，来源与全局 token 一致 */
const activeStyle = computed(() => ({
  color: designToken.value.colorPrimary,
  borderColor: designToken.value.colorPrimary,
  background: `color-mix(in srgb, ${designToken.value.colorPrimary} 10%, #fff)`,
}));

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
  <div class="tab-bar">
    <div class="tab-list">
      <button
        v-for="tab in tabs.tabs"
        :key="tab.path"
        class="tab-chip"
        :class="{ active: isActive(tab) }"
        :style="isActive(tab) ? activeStyle : undefined"
        type="button"
        @click="open(tab)"
      >
        <i v-if="tab.iconClass" :class="tab.iconClass" />
        <span class="tab-title">{{ tab.title }}</span>
        <span
          v-if="!tab.affix"
          class="tab-close"
          title="关闭"
          @click.stop="handleClose(tab)"
        >
          <i class="i-ant-design:close-outlined" />
        </span>
      </button>
    </div>

    <a-dropdown :trigger="['click']" :menu="{ items: moreItems, onClick: handleMore }">
      <button class="tab-more" type="button" title="标签操作">
        <i class="i-ant-design:down-outlined" />
      </button>
    </a-dropdown>
  </div>
</template>

<style scoped>
/* 与头栏同一层布局底色（不设背景），白底页签浮在灰底上 */
.tab-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  height: 40px;
}

.tab-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.tab-list::-webkit-scrollbar { display: none; }

.tab-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  background: #fff;
  color: #4e5969;
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.tab-chip:hover { color: var(--ant-color-primary, #5d87ff); }

.tab-title { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }

.tab-close {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 10px;
  color: inherit;
}

.tab-close:hover {
  background: #f53f3f;
  color: #fff;
}

.tab-more {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  background: #fff;
  color: #4e5969;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}
</style>
