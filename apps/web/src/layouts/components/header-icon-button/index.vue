<script setup lang="ts">
defineOptions({ name: 'HeaderIconButton', inheritAttrs: false });

defineProps<{
  title: string;
  ariaLabel?: string;
}>();
</script>

<template>
  <button
    v-bind="$attrs"
    type="button"
    class="w-9 h-9 inline-grid place-items-center shrink-0 border-none rounded-md bg-transparent text-xl a-color-text cursor-pointer transition-colors duration-200 hover:a-bg-fill-secondary"
    :title="title"
    :aria-label="ariaLabel ?? title"
  >
    <slot />
  </button>
</template>
