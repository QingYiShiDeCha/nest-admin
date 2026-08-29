import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { apiMyMenus, type MenuNode } from '@/api/menu';

export const useMenuStore = defineStore('menu', () => {
  /** 不持久化：菜单授权随时可能被后台改动，每次进应用都重新拉 */
  const tree = ref<MenuNode[]>([]);
  const loaded = ref(false);

  /**
   * 后端返回的树里可能有 visible: false 的节点——它表示「路由可访问但
   * 不在侧边栏显示」（详情页那类）。侧边栏要过滤掉它们，
   * 但过滤时不能丢掉它的子节点… 实际上隐藏节点的子节点也应一起隐藏，
   * 因为侧边栏里没有入口去展开它们。
   */
  const sidebarTree = computed(() => filterVisible(tree.value));

  /** 授权可达的路由 path 集合，供路由守卫判断某个页面是否放行 */
  const reachablePaths = computed(() => {
    const paths = new Set<string>();

    walk(tree.value, (node) => {
      if (node.path) {
        paths.add(node.path);
      }
    });

    return paths;
  });

  async function load(): Promise<MenuNode[]> {
    const data = await apiMyMenus();

    tree.value = data;
    loaded.value = true;

    return data;
  }

  function reset(): void {
    tree.value = [];
    loaded.value = false;
  }

  return { tree, loaded, sidebarTree, reachablePaths, load, reset };
});

function filterVisible(nodes: MenuNode[]): MenuNode[] {
  return nodes
    .filter((node) => node.visible)
    .map((node) => ({ ...node, children: filterVisible(node.children) }));
}

function walk(nodes: MenuNode[], visit: (node: MenuNode) => void): void {
  for (const node of nodes) {
    visit(node);
    walk(node.children, visit);
  }
}
