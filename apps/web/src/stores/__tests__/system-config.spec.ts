import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSystemConfigStore } from '@/stores/system-config';

const mocks = vi.hoisted(() => ({
  runtimeConfig: vi.fn(),
}));

vi.mock('@/api/system-configs', () => ({
  apiRuntimeSystemConfig: mocks.runtimeConfig,
}));

describe('system config store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mocks.runtimeConfig.mockReset();
  });

  it('默认使用内置安全值', () => {
    const store = useSystemConfigStore();

    expect(store.systemName).toBe('Nest Admin');
    expect(store.defaultPageSize).toBe(10);
  });

  it('从公开接口加载运行时参数', async () => {
    mocks.runtimeConfig.mockResolvedValue({
      systemName: '运营管理平台',
      defaultPageSize: 25,
    });
    const store = useSystemConfigStore();

    await store.load();

    expect(store.systemName).toBe('运营管理平台');
    expect(store.defaultPageSize).toBe(25);
  });
});
