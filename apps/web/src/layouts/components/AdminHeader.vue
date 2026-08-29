<script setup lang="ts">
import { theme as antdvTheme } from 'antdv-next';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { BRAND_COLORS } from '@/constants/palette';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useSettingsStore } from '@/stores/settings';
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
const settings = useSettingsStore();
const tabs = useTabsStore();

const { token: designToken } = antdvTheme.useToken();
const headerStyle = computed(() => ({ background: designToken.value.colorBgLayout }));

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
    class="flex items-center justify-between px-6 shrink-0"
    :style="headerStyle"
  >
    <div class="flex items-center gap-3 min-w-0">
      <button
        class="w-8 h-8 flex items-center justify-center shrink-0 border-none bg-transparent text-lg a-color-text cursor-pointer"
        type="button"
        :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
        @click="$emit('toggleSidebar')"
      >
        <i
          v-if="sidebarCollapsed"
          class="i-ri:menu-unfold-line"
        />
        <i v-else class="i-ri:menu-fold-line" />
      </button>

      <AdminBreadcrumb />
    </div>

    <div class="flex items-center gap-4">
      <a-popover trigger="click" placement="bottomRight">
        <template #content>
          <div class="grid grid-cols-4 gap-2.5">
            <button
              v-for="color in BRAND_COLORS"
              :key="color.value"
              class="w-7 h-7 rounded-md border-none cursor-pointer"
              :class="
                settings.primaryColor === color.value
                  ? 'ring-2 ring-primary ring-offset-2 [--un-ring-offset-color:var(--ant-color-bg-container)]'
                  : []
              "
              :style="{ background: color.value }"
              :title="color.name"
              type="button"
              @click="settings.setPrimaryColor(color.value)"
            />
          </div>
        </template>
        <button
          class="w-5.5 h-5.5 rounded-full border-2 a-border-container shadow-[0_0_0_1px_var(--ant-color-border)] cursor-pointer"
          :style="{ background: settings.primaryColor }"
          type="button"
          title="主题色"
        />
      </a-popover>

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
