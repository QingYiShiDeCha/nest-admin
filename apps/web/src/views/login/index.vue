<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '@/api/http';
import logoUrl from '@/assets/logo.svg';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();

const form = reactive({ username: '', password: '' });
const loading = ref(false);
const errorMessage = ref('');

async function handleSubmit(): Promise<void> {
  if (!form.username || !form.password) {
    errorMessage.value = '请填写用户名和密码';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    await auth.login({ username: form.username, password: form.password });
    await menu.load();

    // 带 redirect 回到原来想去的页面，没有则回首页
    const redirect = route.query.redirect;
    await router.replace(typeof redirect === 'string' ? redirect : '/');
  } catch (error) {
    // 后端对「用户不存在」和「密码错误」返回同一句提示（防账号枚举），
    // 这里直接透出它的 message，不要自己二次加工
    errorMessage.value =
      error instanceof ApiError ? error.message : '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center a-bg-layout">
    <a-card class="w-96">
      <template #title>
        <div class="flex items-center gap-3">
          <img :src="logoUrl" alt="nest-admin" class="h-9 w-9 shrink-0" />
          <span>登录</span>
        </div>
      </template>

      <a-form layout="vertical" @submit.prevent="handleSubmit">
        <a-form-item label="用户名">
          <a-input
            v-model:value="form.username"
            placeholder="admin"
            autocomplete="username"
            @press-enter="handleSubmit"
          />
        </a-form-item>

        <a-form-item label="密码">
          <a-input-password
            v-model:value="form.password"
            placeholder="请输入密码"
            autocomplete="current-password"
            @press-enter="handleSubmit"
          />
        </a-form-item>

        <a-alert
          v-if="errorMessage"
          type="error"
          :message="errorMessage"
          class="mb-4"
          show-icon
        />

        <a-button type="primary" block :loading="loading" @click="handleSubmit">
          登录
        </a-button>
      </a-form>
    </a-card>
  </div>
</template>
