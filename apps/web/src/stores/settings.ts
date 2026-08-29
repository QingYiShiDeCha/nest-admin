import { DEFAULT_PRIMARY } from '@/constants/palette';
import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 界面偏好设置。主色经 App.vue 的 ConfigProvider 注入 design token，
 * 切换即时生效；只持久化主色这一个选择，其余保持默认。
 */
export const useSettingsStore = defineStore(
  'settings',
  () => {
    const primaryColor = ref<string>(DEFAULT_PRIMARY);

    function setPrimaryColor(value: string): void {
      primaryColor.value = value;
    }

    return { primaryColor, setPrimaryColor };
  },
  {
    // 刷新后保持用户选的主色。存的是具体色值而不是索引：
    // 调色板调整顺序时已保存的选择不受影响
    persist: { pick: ['primaryColor'] },
  },
);
