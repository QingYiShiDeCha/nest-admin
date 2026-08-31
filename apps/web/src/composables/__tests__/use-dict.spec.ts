import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DictionaryOption } from '@nest-admin/shared';

const apiDictionaryOptions = vi.hoisted(() => vi.fn());

vi.mock('@/api/dictionaries', () => ({ apiDictionaryOptions }));

import { useDict } from '@/composables/use-dict';

describe('useDict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('创建时自动加载启用字典项', async () => {
    const options: DictionaryOption[] = [
      { label: '高', value: 'high', tone: 'error' },
    ];
    apiDictionaryOptions.mockResolvedValue(options);

    const dictionary = useDict('business.priority');
    await vi.waitFor(() => expect(dictionary.loading.value).toBe(false));

    expect(apiDictionaryOptions).toHaveBeenCalledWith('business.priority');
    expect(dictionary.options.value).toEqual(options);
    expect(dictionary.error.value).toBeUndefined();
  });

  it('刷新失败保留旧选项并暴露错误', async () => {
    const options: DictionaryOption[] = [
      { label: '中', value: 'medium', tone: 'warning' },
    ];
    apiDictionaryOptions.mockResolvedValueOnce(options);
    const dictionary = useDict('business.priority');
    await vi.waitFor(() => expect(dictionary.options.value).toEqual(options));

    const error = new Error('offline');
    apiDictionaryOptions.mockRejectedValueOnce(error);

    await expect(dictionary.reload()).resolves.toBe(false);
    expect(dictionary.options.value).toEqual(options);
    expect(dictionary.error.value).toBe(error);
  });

  it('较慢旧请求不会覆盖新结果', async () => {
    let resolveFirst!: (value: DictionaryOption[]) => void;
    apiDictionaryOptions.mockImplementationOnce(
      () =>
        new Promise<DictionaryOption[]>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const dictionary = useDict('business.priority');

    const newest = [{ label: '低', value: 'low', tone: 'info' }] as const;
    apiDictionaryOptions.mockResolvedValueOnce(newest);
    await expect(dictionary.reload()).resolves.toBe(true);

    resolveFirst([{ label: '高', value: 'high', tone: 'error' }]);
    await vi.waitFor(() => expect(dictionary.loading.value).toBe(false));
    expect(dictionary.options.value).toEqual(newest);
  });
});
