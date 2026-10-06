import { defineStore } from 'pinia';
import { ref } from 'vue';

/** 面板里「最近访问」最多留几条，再多挤掉最旧的 */
const MAX_ENTRIES = 8;

export interface RecentVisit {
  path: string;
  title: string;
}

export const useRecentVisitsStore = defineStore(
  'recent-visits',
  () => {
    const visits = ref<RecentVisit[]>([]);

    /** 记一次访问：已存在就提到最前，同一页面不占两个坑 */
    function record(path: string, title: string): void {
      const index = visits.value.findIndex((visit) => visit.path === path);

      if (index !== -1) {
        visits.value.splice(index, 1);
      }

      visits.value.unshift({ path, title });

      if (visits.value.length > MAX_ENTRIES) {
        visits.value.length = MAX_ENTRIES;
      }
    }

    function reset(): void {
      visits.value = [];
    }

    return { visits, record, reset };
  },
  {
    /**
     * 持久化的只是「访问过哪些 path + 当时的标题」，不含任何权限数据。
     * 撤权后这里可能残留条目，所以展示方（命令面板）必须再拿当前菜单过滤一遍，
     * 不能直接把持久化结果当成可跳转列表。
     */
    persist: { pick: ['visits'] },
  },
);
