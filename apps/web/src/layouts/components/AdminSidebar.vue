<script setup lang="ts">
import type { MenuProps } from 'antdv-next';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import logoUrl from '@/assets/logo.svg';
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from '@/constants/palette';
import { useMenuStore } from '@/stores/menu';
import { useSettingsStore } from '@/stores/settings';
import {
  findAncestorKeys,
  findByKey,
  toMenuItems,
  type MenuItems,
} from '../menu-tree';

defineProps<{
  collapsed: boolean;
}>();

const route = useRoute();
const router = useRouter();
const menu = useMenuStore();
const settings = useSettingsStore();

const menuColors = computed(() => {
  if (settings.menuBackground === 'dark') {
    return DARK_THEME_COLORS.traditionalMenu;
  }

  return settings.resolvedTheme === 'dark'
    ? DARK_THEME_COLORS.menu
    : LIGHT_THEME_COLORS.menu;
});

const siderStyle = computed(() => ({
  background: menuColors.value.background,
}));

const systemNameStyle = computed(() => ({
  color: menuColors.value.systemName,
}));

/** 选中项用 path 匹配，与后端菜单的 path 字段、也与 menuKeyOf 对齐 */
const selectedKeys = computed(() => [route.path]);

/** 侧边栏完全由后端菜单驱动，不额外写死入口 */
const sidebarItems = computed<MenuItems>(() => toMenuItems(menu.sidebarTree));
const hasMenus = computed(() => menu.sidebarTree.length > 0);

/** 用户手动展开的目录，与当前路由的祖先目录共同保留 */
const openKeys = ref<string[]>([]);

watch(
  [() => route.path, () => menu.sidebarTree],
  ([path, tree]) => {
    const trail = findAncestorKeys(tree, path);

    if (trail.length > 0) {
      openKeys.value = [...new Set([...openKeys.value, ...trail])];
    }
  },
  { immediate: true },
);

function handleMenuClick({ key }: { key: string | number }): void {
  const path = String(key);
  const node = findByKey(menu.sidebarTree, path);

  if (node?.type === 'external' && node.path) {
    window.open(node.path, '_blank', 'noopener');
    return;
  }

  if (path.startsWith('/')) {
    void router.push(path);
  }
}

const handleOpenChange: NonNullable<MenuProps['onOpenChange']> = (keys) => {
  openKeys.value = keys as string[];
};
</script>

<template>
  <a-layout-sider
    :collapsed="collapsed"
    class="admin-sidebar h-full shrink-0 [&_.ant-layout-sider-children]:h-full [&_.ant-layout-sider-children]:flex [&_.ant-layout-sider-children]:flex-col"
    collapsible
    :trigger="null"
    :width="220"
    :style="siderStyle"
  >
    <div
      class="h-16 px-4 flex items-center justify-center gap-2 overflow-hidden border-r border-solid a-border-border-secondary"
      :style="siderStyle"
    >
      <img :src="logoUrl" alt="nest-admin" class="h-9 w-9 shrink-0" />
      <span
        v-if="!collapsed"
        class="whitespace-nowrap text-xl font-semibold"
        :style="systemNameStyle"
      >
        Nest Admin
      </span>
    </div>

    <a-menu
      class="flex-1 min-h-0 overflow-y-auto"
      :theme="settings.menuBackground"
      mode="inline"
      :items="sidebarItems"
      :selected-keys="selectedKeys"
      :open-keys="openKeys"
      @open-change="handleOpenChange"
      @click="handleMenuClick"
    />

    <div
      v-if="!hasMenus && !collapsed"
      class="px-4 py-3 text-xs"
      :class="
        settings.menuBackground === 'dark'
          ? 'text-white/50'
          : 'a-color-text-tertiary'
      "
    >
      还没有配置菜单，可执行 pnpm db:seed 录入默认菜单
    </div>
  </a-layout-sider>
</template>
