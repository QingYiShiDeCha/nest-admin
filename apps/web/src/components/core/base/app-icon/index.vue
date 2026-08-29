<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'AppIcon', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    icon?: string;
    alt?: string;
  }>(),
  {
    icon: undefined,
    alt: '',
  },
);

const remoteImagePattern = /^(?:https?:\/\/|data:image\/|blob:)/i;
const relativeImagePattern =
  /^\/.*\.(?:png|jpe?g|gif|svg|webp|ico)(?:[?#].*)?$/i;

const isImageUrl = computed(() => {
  const icon = props.icon?.trim();
  return (
    !!icon && (remoteImagePattern.test(icon) || relativeImagePattern.test(icon))
  );
});

const processedIcon = computed(() => {
  const icon = props.icon?.trim();

  if (!icon || !isImageUrl.value || remoteImagePattern.test(icon)) {
    return icon;
  }

  const apiBase = (import.meta.env.VITE_API_BASE || '/api')
    .trim()
    .replace(/\/$/, '');

  if (!apiBase || apiBase === '/') {
    return icon;
  }

  if (
    apiBase.startsWith('/') &&
    (icon === apiBase || icon.startsWith(`${apiBase}/`))
  ) {
    return icon;
  }

  return `${apiBase}${icon}`;
});
</script>

<template>
  <img
    v-if="isImageUrl"
    v-bind="$attrs"
    :src="processedIcon"
    :alt="alt"
    class="app-icon inline-block h-[1em] w-[1em] shrink-0 object-contain align-middle"
  />
  <i
    v-else-if="icon"
    v-bind="$attrs"
    :class="['app-icon', icon]"
    :role="alt ? 'img' : undefined"
    :aria-label="alt || undefined"
    :aria-hidden="alt ? undefined : 'true'"
  />
</template>
