import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaginatedResult } from '@nest-admin/shared';
import { useTable } from '@/composables/use-table';

const pageOf = <T>(list: T[], total: number): PaginatedResult<T> => ({
  list,
  total,
  page: 1,
  pageSize: 10,
});

function makeFetcher<T>(
  impl: (query: { page: number; pageSize: number }) => Promise<PaginatedResult<T>>,
) {
  return vi.fn(impl);
}

describe('useTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('首次 reload 拉取数据并填充分页信息', async () => {
    const fetcher = makeFetcher(async () => pageOf(['a', 'b'], 12));
    const table = useTable<string>({ columns: [], fetcher });

    await expect(table.reload()).resolves.toBe(true);

    expect(table.list.value).toEqual(['a', 'b']);
    expect(table.pagination.value.total).toBe(12);
    expect(fetcher).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(table.loading.value).toBe(false);
  });

  it('filters 展开进请求参数', async () => {
    const fetcher = makeFetcher(async () => pageOf([], 0));
    const table = useTable<string, { keyword?: string; status?: string }>({
      columns: [],
      fetcher,
      filters: { keyword: '', status: 'active' },
    });

    await table.reload();

    expect(fetcher).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      keyword: '',
      status: 'active',
    });
  });

  it('search 重置到第一页再查', async () => {
    const fetcher = makeFetcher(async () => pageOf([], 0));
    const table = useTable<string>({ columns: [], fetcher });

    table.pagination.value.onChange?.(3, 10);
    await vi.waitFor(() =>
      expect(fetcher).toHaveBeenLastCalledWith({ page: 3, pageSize: 10 }),
    );

    await table.search();
    expect(fetcher).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 });
  });

  it('翻页改条数时回到第一页，仅翻页时保持页码', async () => {
    const fetcher = makeFetcher(async () => pageOf([], 0));
    const table = useTable<string>({ columns: [], fetcher });

    table.pagination.value.onChange?.(4, 10);
    await vi.waitFor(() =>
      expect(fetcher).toHaveBeenLastCalledWith({ page: 4, pageSize: 10 }),
    );

    table.pagination.value.onChange?.(4, 20);
    await vi.waitFor(() =>
      expect(fetcher).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 }),
    );
    expect(table.rowOffset.value).toBe(0);
  });

  it('支持自定义默认页大小', async () => {
    const fetcher = makeFetcher(async () => pageOf([], 0));
    const table = useTable<string>({ columns: [], fetcher, defaultPageSize: 25 });

    await table.reload();

    expect(fetcher).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    expect(table.pagination.value.pageSize).toBe(25);
  });

  it('慢的旧响应被丢弃，不覆盖新数据', async () => {
    let resolveFirst!: (value: PaginatedResult<string>) => void;
    const fetcher = makeFetcher<string>(() => {
      if (fetcher.mock.calls.length === 1) {
        return new Promise<PaginatedResult<string>>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(pageOf(['new'], 1));
    });
    const table = useTable<string>({ columns: [], fetcher });

    const first = table.reload();
    table.pagination.value.onChange?.(2, 10);
    await vi.waitFor(() => expect(table.list.value).toEqual(['new']));

    resolveFirst(pageOf(['stale'], 99));
    await expect(first).resolves.toBe(false);

    expect(table.list.value).toEqual(['new']);
    expect(table.pagination.value.total).toBe(1);
    expect(table.loading.value).toBe(false);
  });

  it('当前页被删空时自动回到最后一页重取', async () => {
    const fetcher = makeFetcher<string>((query) =>
      query.page > 2
        ? Promise.resolve(pageOf([], 15))
        : Promise.resolve(pageOf([`page-${query.page}`], 15)),
    );
    const table = useTable<string>({ columns: [], fetcher });

    table.pagination.value.onChange?.(3, 10);
    await vi.waitFor(() => expect(table.pagination.value.current).toBe(2));

    expect(table.list.value).toEqual(['page-2']);
    expect(table.rowOffset.value).toBe(10);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('总数显示当前页存在但列表为空时不重复请求', async () => {
    const fetcher = makeFetcher<string>(async () => pageOf([], 15));
    const table = useTable<string>({ columns: [], fetcher });

    table.pagination.value.onChange?.(2, 10);
    await vi.waitFor(() => expect(table.loading.value).toBe(false));

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(table.pagination.value.current).toBe(2);
    expect(table.list.value).toEqual([]);
  });

  it('第一页为空不触发回拉', async () => {
    const fetcher = makeFetcher<string>(async () => pageOf([], 0));
    const table = useTable<string>({ columns: [], fetcher });

    await table.reload();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(table.pagination.value.current).toBe(1);
  });

  it('reset 清除额外筛选键、恢复初值并从第一页查询', async () => {
    const fetcher = makeFetcher(async () => pageOf([], 0));
    const table = useTable<string, { keyword?: string }>({
      columns: [],
      fetcher,
      filters: { keyword: '' },
    });

    table.filters.keyword = 'admin';
    (table.filters as Record<string, unknown>).unexpected = 'value';
    table.pagination.value.onChange?.(3, 10);
    await vi.waitFor(() => expect(table.pagination.value.current).toBe(3));

    await table.reset();

    expect(table.filters.keyword).toBe('');
    expect('unexpected' in table.filters).toBe(false);
    expect(fetcher).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, keyword: '' });
  });

  it('请求失败保留旧数据、返回 false 并通知错误适配器', async () => {
    const error = new Error('网络异常，请稍后重试');
    const onError = vi.fn();
    const fetcher = makeFetcher<string>(async () => pageOf(['old'], 1));
    const table = useTable<string>({ columns: [], fetcher, onError });
    await table.reload();

    fetcher.mockRejectedValueOnce(error);

    await expect(table.reload()).resolves.toBe(false);
    expect(table.list.value).toEqual(['old']);
    expect(table.loading.value).toBe(false);
    expect(onError).toHaveBeenCalledWith('网络异常，请稍后重试', error);
  });

  it('过期请求失败时不通知错误适配器，也不关闭新请求的 loading', async () => {
    let rejectFirst!: (error: Error) => void;
    const onError = vi.fn();
    const fetcher = makeFetcher<string>(() => {
      if (fetcher.mock.calls.length === 1) {
        return new Promise<PaginatedResult<string>>((_resolve, reject) => {
          rejectFirst = reject;
        });
      }
      return Promise.resolve(pageOf(['new'], 1));
    });
    const table = useTable<string>({ columns: [], fetcher, onError });

    const first = table.reload();
    table.pagination.value.onChange?.(2, 10);
    await vi.waitFor(() => expect(table.list.value).toEqual(['new']));

    rejectFirst(new Error('太慢了'));
    await expect(first).resolves.toBe(false);

    expect(onError).not.toHaveBeenCalled();
    expect(table.loading.value).toBe(false);
  });
});
