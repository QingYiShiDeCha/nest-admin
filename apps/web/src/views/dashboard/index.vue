<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
</script>

<template>
  <a-card title="概览">
    <a-descriptions :column="1">
      <a-descriptions-item label="当前用户">
        {{ auth.profile?.nickname || auth.username }}
      </a-descriptions-item>
      <a-descriptions-item label="角色">
        {{ auth.roles.join('、') || '无' }}
      </a-descriptions-item>
      <a-descriptions-item label="权限码数量">
        {{ auth.isSuperAdmin ? '超管（不受权限码限制）' : auth.permissions.length }}
      </a-descriptions-item>
    </a-descriptions>
  </a-card>
</template>
