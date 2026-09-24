<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { App } from 'antdv-next';

import { ApiError } from '@/api/http';

const { message } = App.useApp();

/**
 * 全局未处理接口错误的兜底提示。
 *
 * 页面自己的请求应该就地 catch 并给出上下文明确的提示；这个监听器只兜
 * 「漏网」的未处理 Promise 拒绝——不让失败无声无息，也不会重复提示
 * 已被处理的请求（unhandledrejection 只在无人 catch 时才会触发）。
 */
function onUnhandledRejection(event: PromiseRejectionEvent): void {
  const { reason } = event;

  if (!(reason instanceof ApiError)) return;

  // 401 由认证流程统一处理（并发刷新、清登录态并跳回登录页），不再打扰
  event.preventDefault();
  if (reason.httpStatus === 401) return;

  void message.error(reason.message || '操作失败，请稍后重试');
}

onMounted(() => {
  window.addEventListener('unhandledrejection', onUnhandledRejection);
});
onBeforeUnmount(() => {
  window.removeEventListener('unhandledrejection', onUnhandledRejection);
});
</script>

<template>
  <!-- 纯逻辑组件：只负责挂全局监听器，跟随 a-app 获得主题化的 message -->
  <span class="hidden" aria-hidden="true" />
</template>
