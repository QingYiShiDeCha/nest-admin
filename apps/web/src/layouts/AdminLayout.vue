<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import { RouterView, useRoute } from 'vue-router';

import { useTabsStore } from '@/stores/tabs';
import AdminHeader from './components/AdminHeader.vue';
import AdminSidebar from './components/AdminSidebar.vue';
import TabBar from './components/TabBar.vue';

const tabs = useTabsStore();
const route = useRoute();
const sidebarCollapsed = ref(false);
const refreshingCacheName = ref<string>();
const refreshVersions = reactive(new Map<string, number>());

const cachedNames = computed(() =>
  tabs.cachedNames.filter((name) => name !== refreshingCacheName.value),
);
const contentKey = computed(
  () => `${route.fullPath}:${refreshVersions.get(route.fullPath) ?? 0}`,
);

async function refreshContent(): Promise<void> {
  const path = route.fullPath;

  refreshingCacheName.value = route.meta.cacheName;
  await nextTick();

  refreshVersions.set(path, (refreshVersions.get(path) ?? 0) + 1);
  refreshingCacheName.value = undefined;
}
</script>

<template>
  <a-layout class="h-screen overflow-hidden">
    <AdminSidebar :collapsed="sidebarCollapsed" />

    <a-layout class="min-w-0 min-h-0 overflow-y-auto">
      <AdminHeader
        :sidebar-collapsed="sidebarCollapsed"
        @refresh-content="refreshContent"
        @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      />

      <TabBar class="sticky top-13 z-10 shrink-0 mb-3 a-bg-layout" />

      <!-- 右侧 Layout 统一承载纵向滚动，使滚动条从视口顶部开始；Header 和 Tabs 吸顶。 -->
      <a-layout-content
        class="px-[15px] md:px-5 pb-6 flex flex-col flex-1 min-h-0"
      >
        <RouterView v-slot="{ Component }">
          <Transition
            mode="out-in"
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <!-- include 用页签的组件名：关掉页签 = 移出缓存 = 状态丢弃，
                 页签里开着的页面在切换间保持实例 -->
            <KeepAlive :include="cachedNames">
              <component :is="Component" :key="contentKey" />
            </KeepAlive>
          </Transition>
        </RouterView>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
