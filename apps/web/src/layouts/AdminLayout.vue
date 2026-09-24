<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue';
import 'overlayscrollbars/overlayscrollbars.css';

import { providePageRefresh } from '@/composables/use-page-refresh';
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from '@/constants/palette';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { useSystemConfigStore } from '@/stores/system-config';
import { useTabsStore } from '@/stores/tabs';
import AdminHeader from './components/AdminHeader.vue';
import AdminSidebar from './components/AdminSidebar.vue';
import TabBar from './components/TabBar.vue';

const tabs = useTabsStore();
const settings = useSettingsStore();
const auth = useAuthStore();
const systemConfig = useSystemConfigStore();
const route = useRoute();
const sidebarCollapsed = ref(false);
const contentKey = computed(() => route.fullPath);
const pageRefresh = providePageRefresh();
const currentYear = new Date().getFullYear();
const watermarkContent = computed(() => [
  systemConfig.systemName,
  auth.profile?.nickname ?? auth.profile?.username ?? auth.username,
]);
const watermarkFont = computed(() => ({
  color:
    settings.resolvedTheme === 'dark'
      ? DARK_THEME_COLORS.foreground.watermark
      : LIGHT_THEME_COLORS.foreground.watermark,
}));

const transitionClasses = computed(() => {
  if (settings.pageTransition === 'fade') {
    return {
      enterActive: 'transition duration-200 ease-out',
      enterFrom: 'opacity-0',
      enterTo: 'opacity-100',
      leaveActive: 'transition duration-150 ease-in',
      leaveFrom: 'opacity-100',
      leaveTo: 'opacity-0',
    };
  }

  if (settings.pageTransition === 'slide-left') {
    return {
      enterActive: 'transition duration-200 ease-out',
      enterFrom: 'opacity-0 translate-x-2',
      enterTo: 'opacity-100 translate-x-0',
      leaveActive: 'transition duration-150 ease-in',
      leaveFrom: 'opacity-100 translate-x-0',
      leaveTo: 'opacity-0 -translate-x-2',
    };
  }

  return {
    enterActive: 'transition duration-200 ease-out',
    enterFrom: 'opacity-0 translate-y-1',
    enterTo: 'opacity-100 translate-y-0',
    leaveActive: 'transition duration-150 ease-in',
    leaveFrom: 'opacity-100 translate-y-0',
    leaveTo: 'opacity-0 -translate-y-1',
  };
});

watch(
  () => settings.showSidebarCollapseButton,
  (visible) => {
    if (!visible) {
      sidebarCollapsed.value = false;
    }
  },
);
</script>

<template>
  <a-layout class="h-screen overflow-hidden">
    <AdminSidebar :collapsed="sidebarCollapsed" />

    <a-layout class="min-w-0 min-h-0 flex flex-col relative">
      <!-- OS 视口本身是 flex 列（任意变体注入）：滚动条挂在全局视口上。
           头部/页签 sticky 常驻视口顶部（与 art-design-pro 的 #app-header 同构）。
           min-h-0 链把高度约束传导到 ProTable：表格页表体内部滚、分页器常驻；
           内容天然超高的页面（如富文本）溢出传播，在全局视口滚动 -->
      <OverlayScrollbarsComponent
        class="flex-1 min-h-0 [&_[data-overlayscrollbars-viewport]]:flex [&_[data-overlayscrollbars-viewport]]:flex-col"
        :options="{
          scrollbars: {
            autoHide: 'leave',
            autoHideDelay: 800,
          },
        }"
      >
        <div class="sticky top-0 z-20 a-bg-layout shrink-0">
          <AdminHeader
            :sidebar-collapsed="sidebarCollapsed"
            :refreshing="pageRefresh.refreshing.value"
            @refresh-content="pageRefresh.refresh"
            @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
          />

          <TabBar v-if="settings.showTabs" class="mb-3" />
        </div>

        <a-watermark
          class="flex flex-col flex-1 min-h-0"
          style="overflow: visible"
          :content="settings.showWatermark ? watermarkContent : undefined"
          :font="watermarkFont"
        >
          <a-layout-content
            class="px-[15px] md:px-5 pb-6 flex flex-col flex-1 min-h-0"
            :class="[
              { 'pt-3': !settings.showTabs },
              settings.containerWidth === 'fixed'
                ? 'w-full max-w-[1440px] mx-auto'
                : 'w-full',
            ]"
          >
            <div class="flex flex-col flex-1 min-h-0">
              <RouterView v-slot="{ Component }">
                <Transition
                  mode="out-in"
                  :css="settings.pageTransition !== 'none'"
                  :enter-active-class="transitionClasses.enterActive"
                  :enter-from-class="transitionClasses.enterFrom"
                  :enter-to-class="transitionClasses.enterTo"
                  :leave-active-class="transitionClasses.leaveActive"
                  :leave-from-class="transitionClasses.leaveFrom"
                  :leave-to-class="transitionClasses.leaveTo"
                >
                  <!-- include 用页签的组件名：关掉页签 = 移出缓存 = 状态丢弃，
                       页签里开着的页面在切换间保持实例 -->
                  <!-- min-h-full：非 flex 布局的页面（如富文本 demo）也撑满视口 -->
                  <KeepAlive :include="tabs.cachedNames">
                    <component
                      :is="Component"
                      :key="contentKey"
                      class="min-h-full"
                    />
                  </KeepAlive>
                </Transition>
              </RouterView>
            </div>

            <footer
              v-if="settings.showCopyright"
              class="shrink-0 pt-4 text-center text-xs a-color-text-tertiary"
            >
              © {{ currentYear }} {{ systemConfig.systemName }}. All rights
              reserved.
            </footer>
          </a-layout-content>
        </a-watermark>
      </OverlayScrollbarsComponent>
    </a-layout>
  </a-layout>
</template>
