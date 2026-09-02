<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { MenuNode } from '@nest-admin/shared';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import { useMenuStore } from '@/stores/menu';
import { resolveMenuIcon } from '../../menu-icons';

interface QuickEntry {
  id: number;
  name: string;
  path: string;
  icon?: string;
  external: boolean;
}

const open = ref(false);
const keyword = ref('');
const router = useRouter();
const menu = useMenuStore();

function flattenEntries(nodes: MenuNode[]): QuickEntry[] {
  return nodes.flatMap((node) => [
    ...(node.path
      ? [
          {
            id: node.id,
            name: node.name,
            path: node.path,
            icon: resolveMenuIcon(node.icon),
            external: node.type === 'external',
          },
        ]
      : []),
    ...flattenEntries(node.children),
  ]);
}

const entries = computed(() => flattenEntries(menu.sidebarTree));
const filteredEntries = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase();

  if (!search) {
    return entries.value;
  }

  return entries.value.filter(
    (entry) =>
      entry.name.toLocaleLowerCase().includes(search) ||
      entry.path.toLocaleLowerCase().includes(search),
  );
});

watch(open, (visible) => {
  if (!visible) {
    keyword.value = '';
  }
});

async function openEntry(entry: QuickEntry): Promise<void> {
  open.value = false;

  if (entry.external) {
    window.open(entry.path, '_blank', 'noopener');
    return;
  }

  await router.push(entry.path);
}
</script>

<template>
  <a-popover v-model:open="open" :trigger="['click']" placement="bottomRight">
    <template #content>
      <div class="w-80">
        <a-input
          v-model:value="keyword"
          allow-clear
          placeholder="搜索菜单名称或路径"
          class="mb-3"
        >
          <template #prefix>
            <AppIcon icon="i-ri:search-line" class="a-color-text-tertiary" />
          </template>
        </a-input>

        <div
          v-if="filteredEntries.length > 0"
          class="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto"
        >
          <button
            v-for="entry in filteredEntries"
            :key="entry.id"
            type="button"
            class="min-w-0 h-10 flex items-center gap-2 border border-solid rounded-md px-3 text-left a-bg-container a-border-border a-color-text cursor-pointer transition-colors hover:border-primary hover:text-primary hover:a-bg-fill-quaternary"
            :title="entry.name"
            @click="openEntry(entry)"
          >
            <AppIcon
              :icon="entry.icon ?? 'i-ri:file-list-3-line'"
              class="shrink-0 text-base"
            />
            <span class="truncate text-sm">{{ entry.name }}</span>
          </button>
        </div>

        <a-empty v-else description="暂无匹配菜单" class="py-5" />
      </div>
    </template>

    <slot name="trigger" />
  </a-popover>
</template>
