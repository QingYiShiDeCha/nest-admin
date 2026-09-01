import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SYSTEM_NAME,
  type RuntimeSystemConfig,
} from '@nest-admin/shared';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { apiRuntimeSystemConfig } from '@/api/system-configs';

export const useSystemConfigStore = defineStore('system-config', () => {
  const systemName = ref(DEFAULT_SYSTEM_NAME);
  const defaultPageSize = ref(DEFAULT_PAGE_SIZE);
  const loaded = ref(false);
  let pending: Promise<RuntimeSystemConfig> | null = null;

  function apply(config: RuntimeSystemConfig): RuntimeSystemConfig {
    systemName.value = config.systemName;
    defaultPageSize.value = config.defaultPageSize;
    loaded.value = true;
    return config;
  }

  function load(force = false): Promise<RuntimeSystemConfig> {
    if (loaded.value && !force) {
      return Promise.resolve({
        systemName: systemName.value,
        defaultPageSize: defaultPageSize.value,
      });
    }

    pending ??= apiRuntimeSystemConfig()
      .then(apply)
      .finally(() => {
        pending = null;
      });

    return pending;
  }

  return { systemName, defaultPageSize, loaded, load };
});
