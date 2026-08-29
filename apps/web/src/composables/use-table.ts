import { message } from 'antdv-next';
import type { TablePaginationConfig } from 'antdv-next';
import { computed, reactive, ref, shallowRef } from 'vue';

/** 与后端 PaginatedResult 对齐 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

interface UseTableOptions<T, F extends object> {
  /** 发起分页请求。filters 由 useTable 展开进查询参数 */
  fetcher: (query: PageQuery & F) => Promise<PageResult<T>>;
  /** 筛选条件初值，reactive 包装后暴露 */
  filters?: F;
  defaultPageSize?: number;
}

/**
 * 分页表格的通用状态机，用户/角色/日志三个页面共用。
 *
 * 只管「查询、翻页、筛选」，不管增删改——写操作的反馈千差万别
 * （刷新本页还是跳回第一页、提示什么），塞进通用层只会变成一堆开关。
 *
 * 三个刻意的决定：
 *
 * 1. 竞态防护：翻页很快时两个请求可能乱序返回，晚到的旧响应不能覆盖
 *    新数据。用单调递增的序号，只有最新一次请求允许落盘。
 * 2. 翻页越界自动回拉：在第 3 页删掉最后一条后，当前页会变成空表。
 *    检测到「这页没数据但总数大于 0」时回到最后一页再取一次。
 * 3. 失败不清空旧数据：网络抖一下表格就空白，用户会以为数据没了。
 *    保留旧列表，弹一条错误提示。
 */
export function useTable<T, F extends object = Record<string, unknown>>(
  options: UseTableOptions<T, F>,
) {
  const filters = reactive({ ...options.filters }) as F;
  const page = ref(1);
  const pageSize = ref(options.defaultPageSize ?? 10);

  // 行数据总是整体替换、从不原地改，shallowRef 足够且省去深层代理开销
  const list = shallowRef<T[]>([]);
  const total = ref(0);
  const loading = ref(false);

  /** 只增不减的请求序号，用于丢弃过期响应 */
  let seq = 0;

  async function run(): Promise<void> {
    const ticket = ++seq;
    loading.value = true;

    try {
      const result = await options.fetcher({
        page: page.value,
        pageSize: pageSize.value,
        ...filters,
      });

      // 已有过更新的请求发出，这份响应作废
      if (ticket !== seq) {
        return;
      }

      total.value = result.total;

      if (result.list.length === 0 && result.total > 0 && page.value > 1) {
        // 删除/筛选后当前页超界：回到最后一页重取。
        // 递归调用会再次递增 seq，本层的 loading 收尾会因 ticket 失效而跳过
        page.value = Math.max(1, Math.ceil(result.total / pageSize.value));
        await run();
        return;
      }

      list.value = result.list;
    } catch (error) {
      if (ticket === seq) {
        // 只吞展示层的错，错误详情通过提示条告诉用户；
        // 不重新抛出——调用方都是 void 调用，抛了也没人接
        const text =
          error instanceof Error ? error.message : '加载失败，请稍后重试';
        void message.error(text);
      }
    } finally {
      if (ticket === seq) {
        loading.value = false;
      }
    }
  }

  /** 应用新筛选：从第一页开始查 */
  async function search(): Promise<void> {
    page.value = 1;
    await run();
  }

  /** a-table 的 pagination.onChange。翻页/改每页条数后立即重新查询 */
  function onPaginationChange(current: number, size: number): void {
    // 每页条数变化时回到第一页：不同页高下 data 的切片完全对不上
    page.value = size === pageSize.value ? current : 1;
    pageSize.value = size;
    void run();
  }

  /** 直接绑给 a-table :pagination */
  const pagination = computed<TablePaginationConfig>(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showSizeChanger: true,
    showTotal: (t: number) => `共 ${t} 条`,
    onChange: onPaginationChange,
  }));

  return {
    filters,
    page,
    pageSize,
    list,
    total,
    loading,
    pagination,
    run,
    search,
    onPaginationChange,
  };
}
