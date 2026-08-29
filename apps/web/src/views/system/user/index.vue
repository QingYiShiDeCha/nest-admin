<script setup lang="ts">
import { PERMISSIONS } from '@nest-admin/shared';

import { usePermission } from '@/composables/use-permission';

const { can } = usePermission();
</script>

<template>
  <a-card title="用户管理">
    <!--
      工具栏按钮用 v-permission：一次性判定，无权限直接从 DOM 摘掉。
      适合这种「进页面时就定了、不会中途变」的场景，写起来最省事。
    -->
    <template #extra>
      <a-space>
        <a-button v-permission="PERMISSIONS.USER_CREATE" type="primary">
          新增用户
        </a-button>
        <a-button v-permission="PERMISSIONS.USER_ASSIGN_ROLE">分配角色</a-button>
        <a-button v-permission="PERMISSIONS.USER_DELETE" danger>批量删除</a-button>
      </a-space>
    </template>

    <!--
      需要跟着状态开合的地方用 v-if + can()：指令只在 mounted 判定一次，
      这里则是响应式的。两条路径共用 checkPermission，判定语义不会分叉。
    -->
    <a-alert
      v-if="can([PERMISSIONS.USER_SESSION_LIST, PERMISSIONS.USER_FORCE_LOGOUT])"
      class="mb-4"
      type="info"
      show-icon
      message="你有查看在线设备与强制下线的权限，相关操作会出现在每行的操作列"
    />

    <a-empty description="用户列表与增删改将在第三步实现">
      <template #image>
        <span class="text-4xl">🚧</span>
      </template>
      <p class="text-gray-400 text-sm">
        本页受权限码 <code>system:user:list</code> 保护，能看到说明鉴权链路已通
      </p>
    </a-empty>
  </a-card>
</template>
