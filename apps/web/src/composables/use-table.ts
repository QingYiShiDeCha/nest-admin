import type { PaginatedResult } from '@nest-admin/shared';
import type { TableColumnsType, TablePaginationConfig } from 'antdv-next';
import { computed, reactive, ref, shallowRef, watch } from 'vue';
import type { ComputedRef, Ref, ShallowRef } from 'vue';

import { useSystemConfigStore } from '@/stores/system-config';

export interface PageQuery {
  page: number;
  pageSize: number;
}

interface BaseUseTableOptions<T, F extends object> {
  /** 表格列定义，支持 antdv-next 原生 render（包括 h 函数与 TSX） */
  columns: TableColumnsType<T>;
  /** 筛选条件初值，reactive 包装后暴露 */
  filters?: F;
  /** 展示层错误适配器；省略时由调用方根据 reload/search/reset 的返回值处理 */
  onError?: (message: string, error: unknown) => void;
}

interface PaginatedUseTableOptions<
  T,
  F extends object,
> extends BaseUseTableOptions<T, F> {
  pagination?: true;
  /** 发起分页请求。filters 由 useTable 展开进查询参数 */
  fetcher: (query: PageQuery & F) => Promise<PaginatedResult<T>>;
  defaultPageSize?: number;
}

interface UnpaginatedUseTableOptions<
  T,
  F extends object,
> extends BaseUseTableOptions<T, F> {
  pagination: false;
  /** 发起一次性列表/树数据请求，不注入 page 与 pageSize */
  fetcher: (filters: F) => Promise<T[]>;
  defaultPageSize?: never;
}

type UseTableOptions<T, F extends object> =
  PaginatedUseTableOptions<T, F> | UnpaginatedUseTableOptions<T, F>;

export interface UseTableReturn<T, F extends object = Record<string, unknown>> {
  columns: TableColumnsType<T>;
  filters: F;
  list: ShallowRef<T[]>;
  loading: Ref<boolean>;
  pagination?: ComputedRef<TablePaginationConfig>;
  rowOffset?: ComputedRef<number>;
  reload(): Promise<boolean>;
  search(): Promise<boolean>;
  reset(): Promise<boolean>;
}

type PaginatedUseTableReturn<T, F extends object> = UseTableReturn<T, F> & {
  pagination: ComputedRef<TablePaginationConfig>;
  rowOffset: ComputedRef<number>;
};

type UnpaginatedUseTableReturn<T, F extends object> = UseTableReturn<T, F> & {
  pagination: undefined;
  rowOffset: undefined;
};

/**
 * 表格数据的通用状态机。分页模式服务用户/角色/日志等列表页，
 * `pagination: false` 服务菜单树等一次性数据源。
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
 *    保留旧列表，通过 onError 通知展示层，并返回 false。
 */
export function useTable<T, F extends object = Record<string, unknown>>(
  options: PaginatedUseTableOptions<T, F>,
): PaginatedUseTableReturn<T, F>;
export function useTable<T, F extends object = Record<string, unknown>>(
  options: UnpaginatedUseTableOptions<T, F>,
): UnpaginatedUseTableReturn<T, F>;
export function useTable<T, F extends object = Record<string, unknown>>(
  options: UseTableOptions<T, F>,
): UseTableReturn<T, F> {
  // 重置要回到调用方声明的初值，留存一份
  const initialFilters = { ...options.filters };
  const filters = reactive({ ...options.filters }) as F;
  const page = ref(1);
  const systemConfig = useSystemConfigStore();
  const pageSize = ref(options.defaultPageSize ?? systemConfig.defaultPageSize);
  let followsSystemPageSize = options.defaultPageSize === undefined;
  let hasLoaded = false;

  // 行数据总是整体替换、从不原地改，shallowRef 足够且省去深层代理开销
  const list = shallowRef<T[]>([]);
  const total = ref(0);
  const loading = ref(false);

  /** 只增不减的请求序号，用于丢弃过期响应 */
  let seq = 0;

  async function reload(): Promise<boolean> {
    const ticket = ++seq;
    loading.value = true;

    try {
      if (options.pagination === false) {
        const result = await options.fetcher({ ...filters } as F);

        if (ticket !== seq) {
          return false;
        }

        total.value = result.length;
        list.value = result;
        return true;
      }

      const result = await options.fetcher({
        page: page.value,
        pageSize: pageSize.value,
        ...filters,
      });

      // 已有过更新的请求发出，这份响应作废
      if (ticket !== seq) {
        return false;
      }

      total.value = result.total;

      if (result.list.length === 0 && result.total > 0 && page.value > 1) {
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value));

        // 只在当前页确实越界时回拉。若后端声称本页存在却返回空列表，
        // 保留这个空结果，避免对同一页无限重复请求。
        if (lastPage < page.value) {
          page.value = lastPage;
          return reload();
        }
      }

      list.value = result.list;
      hasLoaded = true;
      return true;
    } catch (error) {
      if (ticket === seq) {
        const text =
          error instanceof Error ? error.message : '加载失败，请稍后重试';
        options.onError?.(text, error);
      }

      return false;
    } finally {
      if (ticket === seq) {
        loading.value = false;
      }
    }
  }

  /** 应用新筛选：从第一页开始查 */
  async function search(): Promise<boolean> {
    page.value = 1;
    return reload();
  }

  /** 筛选条件回到声明时的初值，并从第一页重新查询 */
  async function reset(): Promise<boolean> {
    const values = filters as Record<string, unknown>;

    for (const key of Object.keys(values)) {
      if (!Object.prototype.hasOwnProperty.call(initialFilters, key)) {
        delete values[key];
      }
    }

    Object.assign(filters, initialFilters);
    page.value = 1;
    return reload();
  }

  /** a-table 的 pagination.onChange。翻页/改每页条数后立即重新查询 */
  function onPaginationChange(current: number, size: number): void {
    // 每页条数变化时回到第一页：不同页高下 data 的切片完全对不上
    if (size !== pageSize.value) {
      followsSystemPageSize = false;
    }
    page.value = size === pageSize.value ? current : 1;
    pageSize.value = size;
    void reload();
  }

  watch(
    () => systemConfig.defaultPageSize,
    (size) => {
      if (!followsSystemPageSize || options.pagination === false) return;

      page.value = 1;
      pageSize.value = size;
      if (hasLoaded) void reload();
    },
  );

  /** 表格序号列只需要偏移量，不暴露内部页码状态 */
  const rowOffset =
    options.pagination === false
      ? undefined
      : computed(() => (page.value - 1) * pageSize.value);

  /** 直接绑给 a-table :pagination */
  const pagination =
    options.pagination === false
      ? undefined
      : computed<TablePaginationConfig>(() => ({
          current: page.value,
          pageSize: pageSize.value,
          total: total.value,
          showSizeChanger: true,
          showTotal: (t: number) => `共 ${t} 条`,
          onChange: onPaginationChange,
        }));

  return {
    columns: options.columns,
    filters,
    list,
    loading,
    pagination,
    rowOffset,
    reload,
    search,
    reset,
  };
}
