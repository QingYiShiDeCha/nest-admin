import type { DictionaryOption } from '@nest-admin/shared';
import { readonly, ref } from 'vue';

import { apiDictionaryOptions } from '@/api/dictionaries';

export function useDict(code: string) {
  const items = ref<DictionaryOption[]>([]);
  const loading = ref(false);
  const error = ref<unknown>();
  let requestId = 0;

  async function reload(): Promise<boolean> {
    const currentRequest = ++requestId;
    loading.value = true;

    try {
      const result = await apiDictionaryOptions(code);
      if (currentRequest !== requestId) return false;
      items.value = result;
      error.value = undefined;
      return true;
    } catch (reason) {
      if (currentRequest === requestId) error.value = reason;
      return false;
    } finally {
      if (currentRequest === requestId) loading.value = false;
    }
  }

  void reload();

  return {
    items: readonly(items),
    options: readonly(items),
    loading: readonly(loading),
    error: readonly(error),
    reload,
  };
}
