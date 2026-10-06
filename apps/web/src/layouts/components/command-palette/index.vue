<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import AppIcon from '@/components/core/base/app-icon/index.vue';
import { useMenuStore } from '@/stores/menu';
import { useRecentVisitsStore } from '@/stores/recent-visits';
import {
  flattenMenuEntries,
  matchMenuEntries,
  type MenuEntry,
} from '../../menu-entries';
import HeaderIconButton from '../header-icon-button/index.vue';

interface PaletteItem extends MenuEntry {
  section: 'recent' | 'menu';
}

const DEFAULT_ICON = 'i-ri:file-list-3-line';
const KBD_CLASS =
  'px-1 py-0.5 mx-0.5 rounded border border-solid a-border-border-secondary text-[10px] leading-none';

const router = useRouter();
const menu = useMenuStore();
const recentVisits = useRecentVisitsStore();

const open = ref(false);
const keyword = ref('');
const activeIndex = ref(0);
const searchRef = ref<{ focus: () => void } | null>(null);
const listRef = ref<HTMLElement | null>(null);

const entries = computed(() => flattenMenuEntries(menu.sidebarTree));

/**
 * 最近访问读自 localStorage，可能留着后台刚撤掉权限的页面，
 * 所以必须拿当前菜单再过滤一遍才能展示，不能直接把持久化结果当可跳转列表。
 */
const recentItems = computed<PaletteItem[]>(() => {
  const accessible = new Map(
    entries.value.map((entry) => [entry.path, entry] as const),
  );

  return recentVisits.visits.flatMap((visit) => {
    const entry = accessible.get(visit.path);

    return entry ? [{ ...entry, name: visit.title, section: 'recent' }] : [];
  });
});

const items = computed<PaletteItem[]>(() => {
  if (keyword.value.trim()) {
    return matchMenuEntries(entries.value, keyword.value).map((entry) => ({
      ...entry,
      section: 'menu',
    }));
  }

  return recentItems.value.length > 0
    ? recentItems.value
    : entries.value.map((entry) => ({ ...entry, section: 'menu' }));
});

/** 只在「展示最近访问」时分组，搜索结果本身按匹配度排，不需要标题 */
const showRecentTitle = computed(
  () => !keyword.value.trim() && recentItems.value.length > 0,
);

watch(items, () => {
  activeIndex.value = 0;
  void nextTick(scrollActiveIntoView);
});

watch(open, (visible) => {
  if (!visible) {
    keyword.value = '';
    activeIndex.value = 0;
    return;
  }

  void nextTick(() => searchRef.value?.focus());
});

function move(step: number): void {
  const total = items.value.length;

  if (total === 0) return;

  // 首尾相接：到底部再按 ↓ 回顶部，长列表里比「卡在边界」好用
  activeIndex.value = (activeIndex.value + step + total) % total;
  void nextTick(scrollActiveIntoView);
}

function scrollActiveIntoView(): void {
  listRef.value
    ?.querySelector('[data-active="true"]')
    ?.scrollIntoView({ block: 'nearest' });
}

async function activate(item: MenuEntry): Promise<void> {
  open.value = false;

  if (item.external) {
    window.open(item.path, '_blank', 'noopener');
    return;
  }

  await router.push(item.path);
}

function activateActive(): void {
  const item = items.value[activeIndex.value];

  if (item) void activate(item);
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    // 不拦下来浏览器会先把快捷键交给自己的搜索栏/地址栏
    event.preventDefault();
    open.value = !open.value;
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown));
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown));
</script>

<template>
  <!-- 单根节点约束：modal 会被 teleport 到 body，这个包裹层实际只承载触发按钮 -->
  <div class="flex items-center">
    <HeaderIconButton
      class="command-palette-trigger"
      title="搜索页面"
      aria-label="打开命令面板"
      @click="open = true"
    >
      <AppIcon
        icon="i-ri:search-line"
        class="command-palette-icon a-color-text text-xl"
      />
    </HeaderIconButton>

    <a-modal
      v-model:open="open"
      :footer="null"
      :closable="false"
      :width="600"
      :style="{ top: '80px' }"
    >
      <a-input
        ref="searchRef"
        v-model:value="keyword"
        placeholder="搜索页面名称或路径"
        class="mb-3"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="activateActive"
      >
        <template #prefix>
          <AppIcon icon="i-ri:search-line" class="a-color-text-tertiary" />
        </template>
      </a-input>

      <div
        v-if="items.length > 0"
        ref="listRef"
        class="max-h-80 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <p
          v-if="showRecentTitle"
          class="mb-1 text-xs a-color-text-tertiary"
        >
          最近访问
        </p>

        <button
          v-for="(item, index) in items"
          :key="`${item.section}-${item.id}`"
          type="button"
          class="command-palette-item w-full min-w-0 h-10 flex items-center gap-2 border border-solid rounded-md px-3 mb-1 text-left a-color-text cursor-pointer transition-colors hover:a-bg-fill-quaternary"
          :class="
            index === activeIndex
              ? 'a-bg-fill-quaternary border-primary text-primary'
              : 'border-transparent'
          "
          :data-active="index === activeIndex ? 'true' : 'false'"
          :title="item.name"
          @click="activate(item)"
          @mouseenter="activeIndex = index"
        >
          <AppIcon
            :icon="item.icon ?? DEFAULT_ICON"
            class="shrink-0 text-base"
          />
          <span class="min-w-0 flex-1 text-sm truncate">
            {{ item.name }}
          </span>
          <span class="shrink-0 text-xs a-color-text-tertiary">
            {{ item.path }}
          </span>
        </button>
      </div>

      <a-empty v-else description="无匹配页面" class="py-5" />

      <div
        class="mt-2 flex items-center gap-2 pt-2 border-t border-solid a-border-border-secondary text-xs a-color-text-tertiary"
      >
        <span><kbd :class="KBD_CLASS">↵</kbd>选择</span>
        <span>
          <kbd :class="KBD_CLASS">↑</kbd><kbd :class="KBD_CLASS">↓</kbd>切换
        </span>
        <span><kbd :class="KBD_CLASS">ESC</kbd>关闭</span>
      </div>
    </a-modal>
  </div>
</template>
