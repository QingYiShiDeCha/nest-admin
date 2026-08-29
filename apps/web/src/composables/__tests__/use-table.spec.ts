import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTable, type PageResult } from '@/composables/use-table';

// use-table 里 import 了 antdv-next 的 message，测试里只给它一个桩，
// 不必把整包组件库拉进测试环境
const messageError = vi.fn();
vi.mock('antdv-next', () => ({
  message: { error: (...args: unknown[]) => messageError(...args) },
}));

const pageOf = <T>(list: T[], total: number): PageResult<T> => ({
  list,
  total,
  page: 1,
  pageSize: 10,
});

/**
 * 造一个可观察调用次数与参数的 fetcher。
 * 参数就按 useTable 必传的分页字段声明：filters 会作为额外属性传入，
 * 而额外属性对非字面量实参不做多余属性检查，所以签名是兼容的。
 */
function makeFetcher<T>(
  impl: (query: { page: number; pageSize: number }) => Promise<PageResult<T>>,
) {
  return vi.fn(impl);
}

describe('useTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    messageError.mockClear();
  });

  it('首次 run 拉取数据并填充分页信息', async () => {
    const fetcher = makeFetcher(async () => pageOf(['a', 'b'], 12));
    const table = useTable<string>({ fetcher });

    await table.run();

    expect(table.list.value).toEqual(['a', 'b']);
    expect(table.total.value).toBe(12);
    expect(fetcher).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(table.loading.value).toBe(false);
  });

  it('filters 展开进请求参数且置空值不传给后端', async () => {
    const fetcher = makeFetcher(async () => pageOf([], 0));
    const table = useTable<string, { keyword?: string; status?: string }>({
      fetcher,
      filters: { keyword: '', status: 'active' },
    });

    await table.run();

    // 空字符串由 withQuery 层处理，useTable 只负责展开；
    // 这里验证的是展开行为本身
    expect(fetcher).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      keyword: '',
      status: 'active',
    });
  });

  it('search 重置到第一页再查', async () => {
    const fetcher = makeFetcher(async () => pageOf([], 0));
    const table = useTable<string>({ fetcher });

    table.onPaginationChange(3, 10);
    await vi.waitFor(() =>
      expect(fetcher).toHaveBeenLastCalledWith({ page: 3, pageSize: 10 }),
    );

    await table.search();
    expect(fetcher).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 });
  });

  it('翻页改条数时回到第一页，仅翻页时保持页码', async () => {
    const fetcher = makeFetcher(async () => pageOf([], 0));
    const table = useTable<string>({ fetcher });

    table.onPaginationChange(4, 10);
    await vi.waitFor(() => expect(fetcher).toHaveBeenLastCalledWith({ page: 4, pageSize: 10 }));

    table.onPaginationChange(4, 20);
    await vi.waitFor(() => expect(fetcher).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 }));
  });

  it('慢的旧响应被丢弃，不覆盖新数据', async () => {
    let resolveFirst!: (v: PageResult<string>) => void;
    const fetcher = makeFetcher<string>(() => {
      // 第一次调用：挂起直到手动放行；之后立即返回
      if (fetcher.mock.calls.length === 1) {
        return new Promise<PageResult<string>>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(pageOf(['new'], 1));
    });
    const table = useTable<string>({ fetcher });

    const first = table.run(); // 第 1 页，慢
    table.onPaginationChange(2, 10); // 第 2 页，快
    await vi.waitFor(() => expect(table.list.value).toEqual(['new']));

    resolveFirst(pageOf(['stale'], 99));
    await first;

    expect(table.list.value).toEqual(['new']);
    expect(table.total.value).toBe(1);
    expect(table.loading.value).toBe(false);
  });

  it('当前页被删空时自动回到最后一页重取', async () => {
    // 模拟「在第 3 页删掉了最后一条」：总数还是 15，但第 3 页已经没有数据
    const fetcher = makeFetcher<string>((query) =>
      query.page > 2
        ? Promise.resolve(pageOf([], 15))
        : Promise.resolve(pageOf([`page-${query.page}`], 15)),
    );
    const table = useTable<string>({ fetcher });
    table.onPaginationChange(3, 10);
    await vi.waitFor(() => expect(table.page.value).toBe(2));

    // 15 条、每页 10 条 → 应回拉到第 2 页并拿到数据
    // 共两次请求：page=3（空）→ 自动回拉 page=2
    expect(table.list.value).toEqual(['page-2']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('第一页为空不触发回拉，也不死循环', async () => {
    const fetcher = makeFetcher<string>(async () => pageOf([], 0));
    const table = useTable<string>({ fetcher });

    await table.run();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(table.page.value).toBe(1);
  });

  it('请求失败保留旧数据、结束 loading 并提示', async () => {
    const fetcher = makeFetcher<string>(async () => pageOf(['old'], 1));
    const table = useTable<string>({ fetcher });
    await table.run();

    fetcher.mockRejectedValueOnce(new Error('网络异常，请稍后重试'));
    await table.run();

    expect(table.list.value).toEqual(['old']);
    expect(table.loading.value).toBe(false);
    expect(messageError).toHaveBeenCalledWith('网络异常，请稍后重试');
  });

  it('失败后旧响应依旧不能落盘：loading 不被过期请求关掉', async () => {
    let rejectFirst!: (e: Error) => void;
    const fetcher = makeFetcher<string>(() => {
      if (fetcher.mock.calls.length === 1) {
        return new Promise<PageResult<string>>((_resolve, reject) => {
          rejectFirst = reject;
        });
      }
      return Promise.resolve(pageOf(['new'], 1));
    });
    const table = useTable<string>({ fetcher });

    const first = table.run();
    table.onPaginationChange(2, 10);
    await vi.waitFor(() => expect(table.list.value).toEqual(['new']));

    rejectFirst(new Error('太慢了'));
    await first.catch(() => undefined);

    expect(messageError).not.toHaveBeenCalled();
    expect(table.loading.value).toBe(false);
  });
});
