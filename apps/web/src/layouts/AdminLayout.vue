<script setup lang="ts">
import type { MenuProps } from 'antdv-next';
import { theme as antdvTheme } from 'antdv-next';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import logoUrl from '@/assets/logo.svg';
import { BRAND_COLORS } from '@/constants/palette';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useSettingsStore } from '@/stores/settings';
import { useTabsStore } from '@/stores/tabs';
import TabBar from './TabBar.vue';
import {
  findAncestorKeys,
  findByKey,
  toMenuItems,
  type MenuItems,
} from './menu-tree';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();

/**
 * 头栏与内容区共用的布局底色（token 而非写死的灰值）：
 * 参考设计里顶栏和页面背景是同一层颜色，暗色模式下也会一起变。
 */
const { token: designToken } = antdvTheme.useToken();
const headerStyle = computed(() => ({ background: designToken.value.colorBgLayout }));

const collapsed = ref(false);

/** 选中项用 path 匹配，与后端菜单的 path 字段、也与 menuKeyOf 对齐 */
const selectedKeys = computed(() => [route.path]);

/**
 * 侧边栏完全由后端菜单驱动，不再写死「首页」。
 * 写死的入口会和 seed 出来的同名菜单重复，而且让侧边栏不再忠实反映
 * 后端授权——排查「为什么这个人能看到这一项」时会多绕一层。
 */
const sidebarItems = computed<MenuItems>(() => toMenuItems(menu.sidebarTree));

const hasMenus = computed(() => menu.sidebarTree.length > 0);

/**
 * 展开的目录。用 v-model 双向绑定，用户手动收起后不会被下面的 watch 强行掀开。
 */
const openKeys = ref<string[]>([]);

/**
 * 进入某页时把它所在的目录补进 openKeys。
 *
 * 同时监听菜单树：菜单是登录后异步拉回来的，只监听路由的话首次加载时
 * 树还是空的，算出来的祖先链为空，刷新页面后当前项所在目录就是收起的。
 * 用并集而不是覆盖，避免把用户自己展开的其他目录收起来。
 */
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

  // external 类型的 path 是完整 URL，交给 router 会被当成站内路径
  if (node?.type === 'external' && node.path) {
    window.open(node.path, '_blank', 'noopener');
    return;
  }

  if (path.startsWith('/')) {
    void router.push(path);
  }
}

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

/** a-menu 的 openChange 回调签名，抽出来让模板不必写内联类型 */
const handleOpenChange: NonNullable<MenuProps['onOpenChange']> = (keys) => {
  openKeys.value = keys as string[];
};

const settings = useSettingsStore();
const tabs = useTabsStore();
</script>

<template>
  <a-layout class="min-h-screen">
    <a-layout-sider v-model:collapsed="collapsed" collapsible :width="220">
      <div class="h-16 flex items-center justify-center gap-1">
        <img :src="logoUrl" alt="nest-admin" class="h-10 w-10 shrink-0" />
        <span class="text-white font-extrabold text-2xl">Nest Admin</span>
      </div>

      <a-menu
        theme="dark"
        mode="inline"
        :items="sidebarItems"
        :selected-keys="selectedKeys"
        :open-keys="openKeys"
        @open-change="handleOpenChange"
        @click="handleMenuClick"
      />

      <div
        v-if="!hasMenus && !collapsed"
        class="px-4 py-3 text-xs text-white/50"
      >
        还没有配置菜单，可执行 pnpm db:seed 录入默认菜单
      </div>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="flex items-center justify-between px-6" :style="headerStyle">
        <span class="text-base">{{ route.meta.title ?? '' }}</span>

        <div class="flex items-center gap-4">
          <!-- 主色切换：点色板弹出色卡，选择即时生效并持久化 -->
          <a-popover trigger="click" placement="bottomRight">
            <template #content>
              <div class="grid grid-cols-4 gap-2.5">
                <button
                  v-for="color in BRAND_COLORS"
                  :key="color.value"
                  class="w-7 h-7 rounded-md border-none cursor-pointer"
                  :class="
                    settings.primaryColor === color.value
                      ? 'ring-2 ring-offset-2 ring-[#1d2129]'
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
              class="w-5.5 h-5.5 rounded-full border-2 border-white shadow-[0_0_0_1px_#e5e6eb] cursor-pointer"
              :style="{ background: settings.primaryColor }"
              type="button"
              title="主题色"
            />
          </a-popover>

          <!-- 显式用点击触发：antdv 默认是 hover，而悬浮菜单在移动端无法触达，
               键盘用户也很难操作，退出登录这类操作不该藏在 hover 里。
               trigger 的类型是数组，写成字符串虽然能跑（String 也有 includes）但类型不对 -->
          <a-dropdown
            :trigger="['click']"
            :menu="{ items: userMenuItems, onClick: handleUserMenuClick }"
          >
            <a class="text-gray-700" @click.prevent>
              {{ auth.profile?.nickname || auth.username }}
              <a-tag v-if="auth.isSuperAdmin" color="gold" class="ml-2">超管</a-tag>
            </a>
          </a-dropdown>
        </div>
      </a-layout-header>

      <TabBar />

      <a-layout-content class="p-6">
        <RouterView v-slot="{ Component }">
          <!-- include 用页签的组件名：关掉页签 = 移出缓存 = 状态丢弃，
               页签里开着的页面在切换间保持实例 -->
          <KeepAlive :include="tabs.cachedNames">
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
