<script setup lang="ts">
import { theme as antdvTheme } from 'antdv-next';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import AppIcon from '@/components/core/base/app-icon/index.vue';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useSettingsStore } from '@/stores/settings';
import { useTabsStore } from '@/stores/tabs';
import { resolveImageUrl } from '@/utils/image-url';
import { resetDynamicRoutes } from '@/router/dynamic-routes';
import AdminBreadcrumb from './AdminBreadcrumb.vue';
import HeaderIconButton from './header-icon-button/index.vue';
import LayoutSettingsDrawer from './LayoutSettingsDrawer.vue';
import NotificationPopover from './notification-popover/index.vue';
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
const settings = useSettingsStore();
const tabs = useTabsStore();
const avatarSrc = computed(() => resolveImageUrl(auth.profile?.avatar));
const isDark = computed(() => settings.resolvedTheme === 'dark');
const settingsOpen = ref(false);

const { token: designToken } = antdvTheme.useToken();
const headerStyle = computed(() => ({
  background: designToken.value.colorBgLayout,
}));

const userMenuItems = computed<MenuItems>(() => [
  { key: 'profile', label: '个人中心' },
  { key: 'logout', label: '退出登录' },
]);

function toggleTheme(): void {
  settings.setThemeMode(isDark.value ? 'light' : 'dark');
}

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
      <HeaderIconButton
        class="-ml-2"
        :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
        @click="$emit('toggleSidebar')"
      >
        <AppIcon icon="i-ri:menu-2-line" />
      </HeaderIconButton>

      <HeaderIconButton
        class="header-refresh-trigger"
        title="刷新"
        @click="$emit('refreshContent')"
      >
        <AppIcon icon="i-ri:refresh-line" class="header-refresh-icon" />
      </HeaderIconButton>

      <AdminBreadcrumb />
    </div>

    <div class="flex items-center gap-4">
      <div class="icon-area flex items-center gap-2">
        <NotificationPopover>
          <template #trigger="{ unreadCount }">
            <HeaderIconButton
              class="notification-trigger"
              title="消息通知"
              aria-label="打开消息通知"
            >
              <a-badge :count="unreadCount" :overflow-count="99" size="small">
                <AppIcon
                  icon="i-ri:notification-3-line"
                  class="notification-icon a-color-text text-xl"
                />
              </a-badge>
            </HeaderIconButton>
          </template>
        </NotificationPopover>

        <HeaderIconButton
          class="theme-toggle-trigger"
          :title="isDark ? '切换浅色主题' : '切换深色主题'"
          @click="toggleTheme"
        >
          <AppIcon
            :icon="isDark ? 'i-ri:sun-line' : 'i-ri:moon-line'"
            class="theme-toggle-icon transition-transform duration-300"
          />
        </HeaderIconButton>

        <HeaderIconButton
          class="layout-settings-trigger"
          title="界面设置"
          @click="settingsOpen = true"
        >
          <AppIcon icon="i-ri:settings-line" class="layout-settings-icon" />
        </HeaderIconButton>
      </div>

      <LayoutSettingsDrawer v-model:open="settingsOpen" />

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
