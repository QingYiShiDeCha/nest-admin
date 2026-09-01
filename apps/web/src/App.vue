<script setup lang="ts">
import { RouterView } from 'vue-router';

import { useAppTheme } from './theme/use-app-theme';

const configProps = useAppTheme();
</script>

<template>
  <a-config-provider v-bind="configProps">
    <a-app class="h-full">
      <div class="h-full a-bg-layout a-color-text">
        <RouterView />
      </div>
    </a-app>
  </a-config-provider>
</template>
