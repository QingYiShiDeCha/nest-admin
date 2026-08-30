<script setup lang="ts">
import { theme as antdvTheme } from 'antdv-next';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import AppIcon from '@/components/core/base/app-icon/index.vue';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useTabsStore } from '@/stores/tabs';
import { resolveImageUrl } from '@/utils/image-url';
import { resetDynamicRoutes } from '@/router/dynamic-routes';
import AdminBreadcrumb from './AdminBreadcrumb.vue';
import LayoutSettingsDrawer from './LayoutSettingsDrawer.vue';
import type { MenuItems } from '../menu-tree';

defineProps<{
  sidebarCollapsed: boolean;
}>();

defineEmits<{
  refreshContent: [];
  toggleSidebar: [];
}>();

const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();
const tabs = useTabsStore();
const avatarSrc = computed(() => resolveImageUrl(auth.profile?.avatar));

const { token: designToken } = antdvTheme.useToken();
const headerStyle = computed(() => ({
  background: designToken.value.colorBgLayout,
}));

const userMenuItems = computed<MenuItems>(() => [
  { key: 'profile', label: '个人中心' },
  { key: 'logout', label: '退出登录' },
]);

async function handleUserMenuClick({
  key,
}: {
  key: string | number;
}): Promise<void> {
  if (key === 'profile') {
    await router.push('/profile');
    return;
  }

  await auth.logout();
  menu.reset();
  tabs.reset();
  resetDynamicRoutes();
  await router.push({ name: 'login' });
}
</script>

<template>
  <a-layout-header
    class="admin-header sticky top-0 z-20 !h-13 !leading-13 flex items-center justify-between px-[15px] md:px-5 shrink-0"
    :style="headerStyle"
  >
    <div class="flex items-center gap-3 min-w-0">
      <button
        class="-ml-2 w-9 h-9 flex items-center justify-center shrink-0 border-none rounded-md bg-transparent text-xl a-color-text cursor-pointer transition-colors hover:a-bg-fill-secondary"
        type="button"
        :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
        @click="$emit('toggleSidebar')"
      >
        <i class="i-ri:menu-2-line" />
      </button>

      <button
        class="header-refresh-trigger w-9 h-9 flex items-center justify-center shrink-0 border-none rounded-md bg-transparent text-xl a-color-text cursor-pointer transition-colors hover:a-bg-fill-secondary"
        type="button"
        title="刷新"
        @click="$emit('refreshContent')"
      >
        <i class="header-refresh-icon i-ri:refresh-line" />
      </button>

      <AdminBreadcrumb />
    </div>

    <div class="flex items-center gap-4">
      <LayoutSettingsDrawer />

      <a-dropdown
        :menu="{ items: userMenuItems, onClick: handleUserMenuClick }"
      >
        <button
          type="button"
          class="border-none bg-transparent p-0 leading-none cursor-pointer"
          aria-label="打开用户菜单"
        >
          <a-avatar :size="32" :src="avatarSrc" alt="用户头像">
            <template #icon>
              <AppIcon icon="i-ri:user-3-line" alt="默认用户头像" />
            </template>
          </a-avatar>
        </button>
      </a-dropdown>
    </div>
  </a-layout-header>
</template>
