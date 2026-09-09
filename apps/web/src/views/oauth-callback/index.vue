<script setup lang="ts">
import { App, Spin } from 'antdv-next';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '@/api/http';
import { apiOAuthExchange } from '@/api/oauth';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { saveTokens } from '@/utils/auth-token';
import { resolveLoginRedirect } from '@/views/login/login-redirect';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();
const { message } = App.useApp();
const error = ref('');

onMounted(async () => {
  const providerError = String(route.query.error ?? '').trim();
  const ticket = String(route.query.ticket ?? '').trim();
  if (providerError) {
    error.value = providerError;
    void message.error(providerError);
    await router.replace('/login');
    return;
  }
  if (!ticket) {
    error.value = 'OAuth 登录凭证缺失';
    await router.replace('/login');
    return;
  }
  try {
    const result = await apiOAuthExchange(ticket);
    saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    await auth.loadProfile();
    await menu.load();
    await router.replace(resolveLoginRedirect(undefined));
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'OAuth 登录失败';
    void message.error(error.value);
    await router.replace('/login');
  }
});

defineOptions({ name: 'OAuthCallbackPage' });
</script>

<template>
  <main class="min-h-[100dvh] flex items-center justify-center a-bg-layout">
    <div class="flex flex-col items-center gap-3 a-color-text-secondary">
      <Spin />
      <span>{{ error || '正在完成登录…' }}</span>
    </div>
  </main>
</template>
