<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <a-result status="403" title="403" sub-title="你没有访问该页面的权限">
    <template #extra>
      <a-button type="primary" @click="router.push('/')">回到首页</a-button>
    </template>
  </a-result>
</template>
