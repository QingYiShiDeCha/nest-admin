<script setup lang="ts">
import type { BreadcrumbProps } from 'antdv-next';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useMenuStore } from '@/stores/menu';
import { findMenuTrail, menuKeyOf } from '../menu-tree';

type BreadcrumbItems = NonNullable<BreadcrumbProps['items']>;

const HOME_PATH = '/dashboard';
const route = useRoute();
const router = useRouter();
const menu = useMenuStore();

function createItem(
  key: string,
  title: string,
  path: string | null,
  current: boolean,
): BreadcrumbItems[number] {
  const target = !current && path ? path : '';

  return {
    key,
    title,
    'data-route': target,
    ...(target ? { class: 'cursor-pointer hover:text-primary' } : {}),
  };
}

const items = computed<BreadcrumbItems>(() => {
  if (route.path === HOME_PATH) {
    return [createItem(HOME_PATH, '首页', HOME_PATH, true)];
  }

  const trail = findMenuTrail(menu.sidebarTree, route.path);
  const pageItems =
    trail.length > 0
      ? trail.map((node, index) =>
          createItem(
            menuKeyOf(node),
            node.name,
            node.path,
            index === trail.length - 1,
          ),
        )
      : [createItem(route.path, String(route.meta.title), route.path, true)];

  return [createItem(HOME_PATH, '首页', HOME_PATH, false), ...pageItems];
});

const handleClickItem: NonNullable<BreadcrumbProps['onClickItem']> = (item, event) => {
  const target = item['data-route'];

  if (target && target !== route.path) {
    event.preventDefault();
    void router.push(target);
  }
};
</script>

<template>
  <a-breadcrumb :items="items" @click-item="handleClickItem" />
</template>
