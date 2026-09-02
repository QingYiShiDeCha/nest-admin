<script setup lang="ts">
import { useGlobalProgress } from '@/composables/use-global-progress';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const progress = useGlobalProgress();
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-150"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200"
    leave-to-class="opacity-0"
  >
    <div
      v-if="settings.showTopProgress && progress.visible.value"
      class="fixed inset-x-0 top-0 z-3000 h-0.5 pointer-events-none"
      role="progressbar"
      aria-label="页面加载进度"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progress.percent.value)"
    >
      <div
        class="h-full bg-primary shadow-[0_0_8px_var(--ant-color-primary)] transition-[width] duration-200 ease-out"
        :style="{ width: `${progress.percent.value}%` }"
      />
    </div>
  </Transition>
</template>
