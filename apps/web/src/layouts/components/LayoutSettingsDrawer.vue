<script setup lang="ts">
import { App } from 'antdv-next';
import { computed } from 'vue';

import themeDarkPreview from '@/assets/images/settings/theme_styles/dark.png';
import themeLightPreview from '@/assets/images/settings/theme_styles/light.png';
import themeSystemPreview from '@/assets/images/settings/theme_styles/system.png';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import { BRAND_COLORS } from '@/constants/palette';
import {
  BORDER_RADIUS_MAX,
  BORDER_RADIUS_MIN,
  MENU_WIDTH_MAX,
  MENU_WIDTH_MIN,
  useSettingsStore,
  type BooleanLayoutSetting,
  type ContainerWidth,
  type PageTransition,
  type TabStyle,
} from '@/stores/settings';

const open = defineModel<boolean>('open', { default: false });
const settings = useSettingsStore();
const { message } = App.useApp();

const menuBackgroundOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
];

const tabStyleOptions = [
  { label: '卡片', value: 'card' },
  { label: '简约', value: 'line' },
  { label: '圆角', value: 'pill' },
];

const pageTransitionOptions = [
  { label: '无动画', value: 'none' },
  { label: '淡入淡出', value: 'fade' },
  { label: '左右滑动', value: 'slide-left' },
  { label: '上下滑动', value: 'slide-up' },
];

const containerWidthOptions = [
  { label: '铺满', value: 'full' },
  { label: '固定宽度', value: 'fixed' },
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

const basicSettings = computed<
  { key: BooleanLayoutSetting; label: string; checked: boolean }[]
>(() => [
  { key: 'showTabs', label: '开启多标签栏', checked: settings.showTabs },
  {
    key: 'sidebarAccordion',
    label: '侧边栏手风琴模式',
    checked: settings.sidebarAccordion,
  },
  {
    key: 'showSidebarCollapseButton',
    label: '显示侧边栏折叠按钮',
    checked: settings.showSidebarCollapseButton,
  },
  {
    key: 'showQuickEntry',
    label: '显示快捷入口',
    checked: settings.showQuickEntry,
  },
  {
    key: 'showRefreshButton',
    label: '显示刷新数据按钮',
    checked: settings.showRefreshButton,
  },
  {
    key: 'showBreadcrumb',
    label: '显示全局面包屑',
    checked: settings.showBreadcrumb,
  },
  {
    key: 'showTopProgress',
    label: '显示顶部进度条',
    checked: settings.showTopProgress,
  },
  {
    key: 'showWatermark',
    label: '显示全局水印',
    checked: settings.showWatermark,
  },
  {
    key: 'mobileTableCardMode',
    label: '移动端表格卡片模式',
    checked: settings.mobileTableCardMode,
  },
  {
    key: 'showCopyright',
    label: '显示版权合规信息',
    checked: settings.showCopyright,
  },
]);

function handleBooleanSettingChange(
  key: BooleanLayoutSetting,
  checked: boolean,
): void {
  settings.setBooleanLayoutSetting(key, checked);
}

function handleMenuWidthChange(value: number | null): void {
  if (typeof value === 'number') {
    settings.setMenuWidth(value);
  }
}

function handleTabStyleChange(value: string | number): void {
  if (value === 'card' || value === 'line' || value === 'pill') {
    settings.setTabStyle(value as TabStyle);
  }
}

function handlePageTransitionChange(value: string | number): void {
  if (
    value === 'none' ||
    value === 'fade' ||
    value === 'slide-left' ||
    value === 'slide-up'
  ) {
    settings.setPageTransition(value as PageTransition);
  }
}

function handleBorderRadiusChange(value: number | null): void {
  if (typeof value === 'number') {
    settings.setBorderRadius(value);
  }
}

function handleContainerWidthChange(value: string | number): void {
  if (value === 'full' || value === 'fixed') {
    settings.setContainerWidth(value as ContainerWidth);
  }
}

async function copySettings(): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    void message.error('当前浏览器不支持复制配置');
    return;
  }

  await navigator.clipboard.writeText(
    JSON.stringify(
      { version: 1, settings: settings.getSettingsSnapshot() },
      null,
      2,
    ),
  );
  void message.success('界面配置已复制');
}

function resetSettings(): void {
  settings.resetSettings();
  void message.success('界面配置已恢复默认');
}
</script>

<template>
  <a-drawer v-model:open="open" title="界面设置" size="372px">
    <div class="flex flex-col gap-7 pb-2">
      <section>
        <div class="mb-3 flex items-center gap-2.5">
          <span class="h-4 w-1 shrink-0 rounded-full bg-primary" />
          <h3
            class="m-0 text-[15px] font-semibold leading-6 [color:var(--ant-color-text-heading)]"
          >
            主题风格
          </h3>
          <span class="h-px flex-1 [background:var(--ant-color-split)]" />
        </div>
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
            <span class="mt-1.5 block text-sm font-medium">{{
              style.label
            }}</span>
          </button>
        </div>
      </section>

      <section>
        <div class="mb-3 flex items-center gap-2.5">
          <span class="h-4 w-1 shrink-0 rounded-full bg-primary" />
          <h3
            class="m-0 text-[15px] font-semibold leading-6 [color:var(--ant-color-text-heading)]"
          >
            主题色
          </h3>
          <span class="h-px flex-1 [background:var(--ant-color-split)]" />
        </div>
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
        <div class="mb-3 flex items-center gap-2.5">
          <span class="h-4 w-1 shrink-0 rounded-full bg-primary" />
          <h3
            class="m-0 text-[15px] font-semibold leading-6 [color:var(--ant-color-text-heading)]"
          >
            菜单背景
          </h3>
          <span class="h-px flex-1 [background:var(--ant-color-split)]" />
        </div>
        <a-segmented
          :value="settings.menuBackground"
          class="w-full [&_.ant-segmented-item-label]:text-sm [&_.ant-segmented-item-label]:font-medium"
          block
          :options="menuBackgroundOptions"
          @update:value="handleMenuBackgroundChange"
        />
      </section>

      <section>
        <div class="mb-1 flex items-center gap-2.5">
          <span class="h-4 w-1 shrink-0 rounded-full bg-primary" />
          <h3
            class="m-0 text-[15px] font-semibold leading-6 [color:var(--ant-color-text-heading)]"
          >
            基础配置
          </h3>
          <span class="h-px flex-1 [background:var(--ant-color-split)]" />
        </div>
        <div>
          <div
            class="min-h-12 flex items-center justify-between gap-4 border-b [border-color:var(--ant-color-split)]"
          >
            <span
              class="text-sm font-medium [color:var(--ant-color-text-secondary)]"
              >容器宽度</span
            >
            <a-select
              :value="settings.containerWidth"
              :options="containerWidthOptions"
              class="w-36 [&_.ant-select-selection-item]:text-sm [&_.ant-select-selection-item]:font-medium"
              @update:value="handleContainerWidthChange"
            />
          </div>
          <div
            v-for="setting in basicSettings"
            :key="setting.key"
            class="h-11 flex items-center justify-between gap-4 border-b last:border-b-0 [border-color:var(--ant-color-split)]"
          >
            <span
              class="min-w-0 text-sm font-medium leading-5 [color:var(--ant-color-text-secondary)]"
              >{{ setting.label }}</span
            >
            <a-switch
              :checked="setting.checked"
              :aria-label="setting.label"
              size="small"
              @update:checked="handleBooleanSettingChange(setting.key, $event)"
            />
          </div>
        </div>
      </section>

      <section>
        <div class="mb-1 flex items-center gap-2.5">
          <span class="h-4 w-1 shrink-0 rounded-full bg-primary" />
          <h3
            class="m-0 text-[15px] font-semibold leading-6 [color:var(--ant-color-text-heading)]"
          >
            布局配置
          </h3>
          <span class="h-px flex-1 [background:var(--ant-color-split)]" />
        </div>
        <div>
          <div
            class="min-h-12 flex items-center justify-between gap-4 border-b [border-color:var(--ant-color-split)]"
          >
            <span
              class="text-sm font-medium [color:var(--ant-color-text-secondary)]"
              >菜单宽度</span
            >
            <a-input-number
              :value="settings.menuWidth"
              :min="MENU_WIDTH_MIN"
              :max="MENU_WIDTH_MAX"
              :step="10"
              class="w-30 [&_.ant-input-number-input]:text-sm [&_.ant-input-number-input]:font-medium [&_.ant-input-number-group-addon]:text-sm"
              addon-after="px"
              @update:value="handleMenuWidthChange"
            />
          </div>
          <div
            class="min-h-12 flex items-center justify-between gap-4 border-b [border-color:var(--ant-color-split)]"
          >
            <span
              class="text-sm font-medium [color:var(--ant-color-text-secondary)]"
              >标签页风格</span
            >
            <a-select
              :value="settings.tabStyle"
              :options="tabStyleOptions"
              class="w-36 [&_.ant-select-selection-item]:text-sm [&_.ant-select-selection-item]:font-medium"
              @update:value="handleTabStyleChange"
            />
          </div>
          <div
            class="min-h-12 flex items-center justify-between gap-4 border-b [border-color:var(--ant-color-split)]"
          >
            <span
              class="text-sm font-medium [color:var(--ant-color-text-secondary)]"
              >页面切换动画</span
            >
            <a-select
              :value="settings.pageTransition"
              :options="pageTransitionOptions"
              class="w-36 [&_.ant-select-selection-item]:text-sm [&_.ant-select-selection-item]:font-medium"
              @update:value="handlePageTransitionChange"
            />
          </div>
          <div class="min-h-12 flex items-center justify-between gap-4">
            <span
              class="text-sm font-medium [color:var(--ant-color-text-secondary)]"
              >全局圆角</span
            >
            <a-input-number
              :value="settings.borderRadius"
              :min="BORDER_RADIUS_MIN"
              :max="BORDER_RADIUS_MAX"
              class="w-30 [&_.ant-input-number-input]:text-sm [&_.ant-input-number-input]:font-medium [&_.ant-input-number-group-addon]:text-sm"
              addon-after="px"
              @update:value="handleBorderRadiusChange"
            />
          </div>
        </div>
      </section>

      <div
        class="grid grid-cols-2 gap-3 border-t border-solid pt-4 [border-color:var(--ant-color-split)]"
      >
        <a-button block @click="copySettings">
          <template #icon>
            <AppIcon icon="i-ri:file-copy-line" />
          </template>
          复制配置
        </a-button>

        <a-popconfirm
          title="确认恢复所有默认界面配置？"
          ok-text="恢复默认"
          cancel-text="取消"
          @confirm="resetSettings"
        >
          <a-button block danger>
            <template #icon>
              <AppIcon icon="i-ri:restart-line" />
            </template>
            重置配置
          </a-button>
        </a-popconfirm>
      </div>
    </div>
  </a-drawer>
</template>
