<script setup lang="ts">
import type { MenuProps } from 'antdv-next';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { MenuNode } from '@/api/menu';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();

const collapsed = ref(false);

/** 当前选中项用 path 匹配，与后端菜单的 path 字段对齐 */
const selectedKeys = computed(() => [route.path]);

/** a-menu 的 items 类型，Menu 的 ItemType 没有单独导出，只能从 props 上索引 */
type MenuItems = NonNullable<MenuProps['items']>;

/**
 * 后端菜单树转成 antdv 的 items 结构。
 *
 * 用 items 而不是模板里嵌套 a-sub-menu：菜单深度由后端数据决定，
 * 模板写死两层的话第三层就渲染不出来，递归组件又比一个纯函数更绕。
 */
function toMenuItems(nodes: MenuNode[]): MenuItems {
  return nodes.map((node) => {
    const key = node.path ?? `node-${node.id}`;

    if (node.children.length > 0) {
      return { key, label: node.name, children: toMenuItems(node.children) };
    }

    // title 是侧栏收起后 tooltip 显示的文字，不给的话收起时只剩图标位
    return { key, label: node.name, title: node.name };
  });
}

const sidebarItems = computed<MenuItems>(() => [
  { key: '/dashboard', label: '首页', title: '首页' },
  ...toMenuItems(menu.sidebarTree),
]);

const hasMenus = computed(() => menu.sidebarTree.length > 0);

/** 拿 key 反查节点，用于区分外链与内部路由 */
function findByKey(nodes: MenuNode[], key: string): MenuNode | undefined {
  for (const node of nodes) {
    if ((node.path ?? `node-${node.id}`) === key) {
      return node;
    }

    const hit = findByKey(node.children, key);

    if (hit) {
      return hit;
    }
  }

  return undefined;
}

function handleMenuClick({ key }: { key: string | number }): void {
  const path = String(key);
  const node = findByKey(menu.sidebarTree, path);

  // external 类型的 path 是完整 URL，不能交给 router
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

async function handleUserMenuClick({ key }: { key: string | number }): Promise<void> {
  if (key === 'profile') {
    await router.push('/profile');
    return;
  }

  await auth.logout();
  menu.reset();
  await router.push({ name: 'login' });
}
</script>

<template>
  <a-layout class="min-h-screen">
    <a-layout-sider v-model:collapsed="collapsed" collapsible :width="220">
      <div class="h-16 flex items-center justify-center text-white font-semibold">
        {{ collapsed ? 'NA' : 'nest-admin' }}
      </div>

      <a-menu
        theme="dark"
        mode="inline"
        :items="sidebarItems"
        :selected-keys="selectedKeys"
        @click="handleMenuClick"
      />

      <div v-if="!hasMenus && !collapsed" class="px-4 py-3 text-xs text-white/50">
        还没有配置菜单，可在「菜单管理」中添加
      </div>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="bg-white flex items-center justify-between px-6">
        <span class="text-base">{{ route.meta.title ?? '' }}</span>

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
      </a-layout-header>

      <a-layout-content class="p-6">
        <RouterView />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
