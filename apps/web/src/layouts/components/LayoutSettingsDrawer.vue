<script setup lang="ts">
import { reactive } from 'vue';

import themeDarkPreview from '@/assets/images/settings/theme_styles/dark.png';
import themeLightPreview from '@/assets/images/settings/theme_styles/light.png';
import themeSystemPreview from '@/assets/images/settings/theme_styles/system.png';
import { BRAND_COLORS } from '@/constants/palette';
import { useSettingsStore } from '@/stores/settings';

const open = defineModel<boolean>('open', { default: false });
const settings = useSettingsStore();

const menuBackgroundOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
];

const themeStyles = [
  {
    key: 'light',
    label: '浅色',
    title: '浅色主题',
    image: themeLightPreview,
  },
  {
    key: 'dark',
    label: '深色',
    title: '深色主题',
    image: themeDarkPreview,
  },
  {
    key: 'system',
    label: '系统',
    title: '跟随系统主题',
    image: themeSystemPreview,
  },
] as const;

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
  <a-drawer v-model:open="open" title="界面设置" size="372px">
    <div class="flex flex-col gap-8">
        <section>
          <h3 class="mb-4 text-center text-sm font-medium a-color-text">
            主题风格
          </h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="style in themeStyles"
              :key="style.key"
              class="min-w-0 border rounded-md bg-transparent p-1.5 cursor-pointer"
              :class="
                settings.themeMode === style.key
                  ? 'border-primary text-primary a-bg-primary-bg'
                  : 'a-border-border a-color-text-secondary a-bg-container hover:border-primary'
              "
              type="button"
              :title="style.title"
              :aria-pressed="settings.themeMode === style.key"
              @click="settings.setThemeMode(style.key)"
            >
              <img
                :src="style.image"
                :alt="style.title"
                class="block aspect-[11/8] w-full rounded object-cover"
              />
              <span class="mt-1.5 block text-xs">{{ style.label }}</span>
            </button>
          </div>
        </section>

        <section>
          <h3 class="mb-4 text-center text-sm font-medium a-color-text">
            主题色
          </h3>
          <div class="flex flex-wrap justify-center gap-4 px-2">
            <button
              v-for="color in BRAND_COLORS"
              :key="color.value"
              class="h-8 w-8 rounded-full border-2 border-solid cursor-pointer transition-transform duration-200 hover:scale-110"
              :class="
                settings.primaryColor === color.value
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'a-border-border'
              "
              type="button"
              :title="`${color.name}主题色`"
              :aria-label="`${color.name}主题色`"
              :aria-pressed="settings.primaryColor === color.value"
              :style="{ backgroundColor: color.value }"
              @click="settings.setPrimaryColor(color.value)"
            >
              <i
                v-if="settings.primaryColor === color.value"
                class="i-ri:check-line text-sm text-white drop-shadow"
              />
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
</template>
