<script setup lang="ts">
import { reactive, ref } from 'vue';

import { useSettingsStore } from '@/stores/settings';

const open = ref(false);
const settings = useSettingsStore();
const menuLayout = ref('vertical');
const direction = ref('ltr');

const menuLayouts = [
  { key: 'double', label: '双列', icon: 'i-ri:layout-column-line' },
  { key: 'vertical', label: '垂直', icon: 'i-ri:layout-left-line' },
  { key: 'horizontal', label: '水平', icon: 'i-ri:layout-top-line' },
  { key: 'mixed', label: '混合', icon: 'i-ri:layout-masonry-line' },
  { key: 'floating', label: '悬浮', icon: 'i-ri:layout-grid-line' },
  { key: 'sidebar', label: '侧边栏', icon: 'i-ri:layout-left-2-line' },
] as const;

const menuBackgroundOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
];

const directionOptions = [
  { label: 'LTR', value: 'ltr' },
  { label: 'RTL', value: 'rtl' },
];

function handleMenuBackgroundChange(value: string | number): void {
  if (value === 'light' || value === 'dark') {
    settings.setMenuBackground(value);
  }
}

const basicSettings = reactive([
  { key: 'tabs', label: '开启多标签栏', checked: true },
  { key: 'accordion', label: '侧边栏手风琴模式', checked: false },
  { key: 'collapse', label: '显示侧边栏折叠按钮', checked: true },
  { key: 'quick-entry', label: '显示快捷入口', checked: false },
]);
</script>

<template>
  <div class="contents">
    <button
      class="layout-settings-trigger w-8 h-8 inline-grid place-items-center shrink-0 border-none bg-transparent text-lg a-color-text cursor-pointer"
      type="button"
      title="界面设置"
      @click="open = true"
    >
      <i class="layout-settings-icon i-ri:settings-line" />
    </button>

    <a-drawer v-model:open="open" title="界面设置" width="372px">
      <div class="flex flex-col gap-8">
        <section>
          <h3 class="mb-4 text-center text-sm font-medium a-color-text">
            主题风格
          </h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              class="min-w-0 border rounded-md bg-transparent p-1.5 cursor-pointer"
              :class="
                settings.themeMode === 'light'
                  ? 'border-primary text-primary a-bg-primary-bg'
                  : 'a-border-border a-color-text-secondary a-bg-container hover:border-primary'
              "
              type="button"
              title="浅色主题"
              :aria-pressed="settings.themeMode === 'light'"
              @click="settings.setThemeMode('light')"
            >
              <span class="h-14 flex overflow-hidden rounded bg-gray-100">
                <span class="w-1/4 bg-white border-r border-gray-200" />
                <span class="flex-1 p-1.5">
                  <span class="block h-1.5 rounded bg-white" />
                  <span class="mt-1.5 block h-8 rounded bg-white" />
                </span>
              </span>
              <span class="mt-1.5 block text-xs">浅色</span>
            </button>

            <button
              class="min-w-0 border rounded-md bg-transparent p-1.5 cursor-pointer"
              :class="
                settings.themeMode === 'dark'
                  ? 'border-primary text-primary a-bg-primary-bg'
                  : 'a-border-border a-color-text-secondary a-bg-container hover:border-primary'
              "
              type="button"
              title="深色主题"
              :aria-pressed="settings.themeMode === 'dark'"
              @click="settings.setThemeMode('dark')"
            >
              <span class="h-14 flex overflow-hidden rounded bg-gray-800">
                <span class="w-1/4 bg-gray-950 border-r border-gray-700" />
                <span class="flex-1 p-1.5">
                  <span class="block h-1.5 rounded bg-gray-700" />
                  <span class="mt-1.5 block h-8 rounded bg-gray-700" />
                </span>
              </span>
              <span class="mt-1.5 block text-xs">深色</span>
            </button>

            <button
              class="min-w-0 border rounded-md bg-transparent p-1.5 cursor-pointer"
              :class="
                settings.themeMode === 'system'
                  ? 'border-primary text-primary a-bg-primary-bg'
                  : 'a-border-border a-color-text-secondary a-bg-container hover:border-primary'
              "
              type="button"
              title="跟随系统主题"
              :aria-pressed="settings.themeMode === 'system'"
              @click="settings.setThemeMode('system')"
            >
              <span class="h-14 flex overflow-hidden rounded">
                <span class="w-1/2 bg-white border-r border-gray-200" />
                <span class="w-1/2 bg-gray-900" />
              </span>
              <span class="mt-1.5 block text-xs">系统</span>
            </button>
          </div>
        </section>

        <section>
          <h3 class="mb-4 text-center text-sm font-medium a-color-text">
            菜单布局
          </h3>
          <div class="grid grid-cols-3 gap-x-3 gap-y-4">
            <button
              v-for="layout in menuLayouts"
              :key="layout.key"
              class="min-w-0 border rounded-md bg-transparent p-2 cursor-pointer"
              :class="
                menuLayout === layout.key
                  ? 'border-primary text-primary a-bg-primary-bg'
                  : 'a-border-border a-color-text-secondary a-bg-container hover:border-primary'
              "
              type="button"
              :title="`${layout.label}菜单`"
              :aria-pressed="menuLayout === layout.key"
              @click="menuLayout = layout.key"
            >
              <span
                class="h-10 grid place-items-center rounded a-bg-fill-tertiary text-2xl"
              >
                <i :class="layout.icon" />
              </span>
              <span class="mt-1.5 block text-xs">{{ layout.label }}</span>
            </button>
          </div>
        </section>

        <section>
          <h3 class="mb-4 text-center text-sm font-medium a-color-text">
            菜单背景
          </h3>
          <a-segmented
            :value="settings.menuBackground"
            class="w-full"
            block
            :options="menuBackgroundOptions"
            @update:value="handleMenuBackgroundChange"
          />
        </section>

        <section>
          <h3 class="mb-4 text-center text-sm font-medium a-color-text">
            布局方向
          </h3>
          <a-segmented
            v-model:value="direction"
            class="w-full"
            block
            :options="directionOptions"
          />
        </section>

        <section>
          <h3 class="mb-2 text-center text-sm font-medium a-color-text">
            基础配置
          </h3>
          <div>
            <div
              v-for="setting in basicSettings"
              :key="setting.key"
              class="h-11 flex items-center justify-between gap-4 border-b last:border-b-0 [border-color:var(--ant-color-split)]"
            >
              <span class="min-w-0 text-sm a-color-text">{{
                setting.label
              }}</span>
              <a-switch v-model:checked="setting.checked" size="small" />
            </div>
          </div>
        </section>
      </div>
    </a-drawer>
  </div>
</template>
