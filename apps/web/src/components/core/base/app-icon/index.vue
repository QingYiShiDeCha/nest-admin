<script setup lang="ts">
import { computed } from 'vue';

import {
  isImageUrl as checkImageUrl,
  resolveImageUrl,
} from '@/utils/image-url';

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

const isImageUrl = computed(() => checkImageUrl(props.icon));
const processedIcon = computed(() => resolveImageUrl(props.icon));
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
