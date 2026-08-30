<script setup lang="ts">
import { theme as antdvTheme } from 'antdv-next';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useTabsStore } from '@/stores/tabs';
import AdminBreadcrumb from './AdminBreadcrumb.vue';
import LayoutSettingsDrawer from './LayoutSettingsDrawer.vue';
import type { MenuItems } from '../menu-tree';

defineProps<{
  sidebarCollapsed: boolean;
}>();

defineEmits<{
  toggleSidebar: [];
}>();

const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();
const tabs = useTabsStore();

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
      
      <AdminBreadcrumb />
    </div>

    <div class="flex items-center gap-4">
      <LayoutSettingsDrawer />

      <a-dropdown
        :trigger="['click']"
        :menu="{ items: userMenuItems, onClick: handleUserMenuClick }"
      >
        <a class="a-color-text" @click.prevent>
          {{ auth.profile?.nickname || auth.username }}
          <a-tag v-if="auth.isSuperAdmin" color="gold" class="ml-2">超管</a-tag>
        </a>
      </a-dropdown>
    </div>
  </a-layout-header>
</template>
