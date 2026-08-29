<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
</script>

<template>
  <a-card title="个人中心">
    <a-descriptions :column="1" bordered>
      <a-descriptions-item label="用户名">{{ auth.username }}</a-descriptions-item>
      <a-descriptions-item label="昵称">
        {{ auth.profile?.nickname ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="邮箱">
        {{ auth.profile?.email ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="角色">
        {{ auth.roles.join('、') || '无' }}
      </a-descriptions-item>
    </a-descriptions>

    <a-alert
      class="mt-4"
      type="info"
      show-icon
      message="修改密码与登录设备管理将在后续步骤实现"
    />
  </a-card>
</template>
