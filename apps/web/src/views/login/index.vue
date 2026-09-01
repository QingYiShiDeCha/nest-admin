<script setup lang="ts">
import type { FormProps } from 'antdv-next';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '@/api/http';
import logoUrl from '@/assets/logo.svg';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useSettingsStore } from '@/stores/settings';
import { useSystemConfigStore } from '@/stores/system-config';
import LoginCharacters from './components/LoginCharacters.vue';
import { resolveLoginRedirect } from './login-redirect';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();
const settings = useSettingsStore();
const systemConfig = useSystemConfigStore();

const form = reactive({ username: '', password: '' });
const rules: FormProps['rules'] = {
  username: [
    { required: true, message: '请输入用户名', trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: ['blur', 'change'] },
  ],
};
const loading = ref(false);
const errorMessage = ref('');
const activeField = ref<'username' | 'password' | null>(null);
const passwordVisible = ref(false);
const isDark = computed(() => settings.resolvedTheme === 'dark');
const hasFormContent = computed(() => Boolean(form.username || form.password));
const characterStatus = computed<'idle' | 'loading' | 'error'>(() => {
  if (loading.value) return 'loading';
  if (errorMessage.value) return 'error';
  return 'idle';
});
const passwordVisibilityToggle = computed(() => ({
  visible: passwordVisible.value,
  onVisibleChange: (visible: boolean) => {
    passwordVisible.value = visible;
  },
}));

const thirdPartyProviders = [
  { key: 'wechat', label: '微信', icon: 'i-ri:wechat-fill' },
  { key: 'dingtalk', label: '钉钉', icon: 'i-ri:dingding-fill' },
  { key: 'github', label: 'GitHub', icon: 'i-ri:github-fill' },
] as const;

function clearError(): void {
  errorMessage.value = '';
}

function toggleTheme(): void {
  settings.setThemeMode(isDark.value ? 'light' : 'dark');
}

function focusField(field: 'username' | 'password'): void {
  activeField.value = field;
}

function blurField(field: 'username' | 'password'): void {
  if (activeField.value === field) {
    activeField.value = null;
  }
}

async function handleSubmit(): Promise<void> {
  if (loading.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    await auth.login({
      username: form.username.trim(),
      password: form.password,
    });
    await menu.load();
    await router.replace(resolveLoginRedirect(route.query.redirect));
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

defineOptions({ name: 'LoginPage' });
</script>

<template>
  <main
    class="min-h-[100dvh] grid overflow-hidden a-bg-layout lg:grid-cols-[minmax(420px,45%)_minmax(0,1fr)]"
  >
    <section
      class="relative hidden min-h-[100dvh] overflow-hidden border-r border-solid a-border-border-secondary a-bg-fill-tertiary px-12 py-10 lg:flex lg:flex-col xl:px-16 xl:py-12 2xl:px-20"
    >
      <div class="relative flex items-center gap-3">
        <span
          class="h-11 w-11 grid shrink-0 place-items-center border border-solid rounded-lg a-border-border a-bg-container"
        >
          <img :src="logoUrl" :alt="systemConfig.systemName" class="h-9 w-9" />
        </span>
        <span class="text-lg font-semibold a-color-text">{{
          systemConfig.systemName
        }}</span>
      </div>

      <div class="relative my-auto w-full max-w-[620px] self-center">
        <h1 class="m-0 text-5xl font-semibold leading-tight a-color-text">
          {{ systemConfig.systemName }}
        </h1>
        <p class="mb-0 mt-4 text-xl font-medium a-color-text-secondary">
          企业级后台管理系统
        </p>

        <LoginCharacters
          class="mt-8"
          :active-field="activeField"
          :password-visible="passwordVisible"
          :has-content="hasFormContent"
          :status="characterStatus"
        />
      </div>

      <p class="relative mb-0 text-xs a-color-text-tertiary">
        © 2026 {{ systemConfig.systemName }}. All rights reserved.
      </p>
    </section>

    <section
      class="min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:px-8 sm:py-10 lg:px-12"
    >
      <div
        class="w-full max-w-[468px] border border-solid rounded-lg a-border-border a-bg-container px-6 py-7 shadow-sm sm:px-10 sm:py-9 xl:px-12 xl:py-10"
      >
        <div class="mb-8 min-h-10 flex items-center justify-between">
          <div class="flex items-center gap-3 lg:hidden">
            <img
              :src="logoUrl"
              :alt="systemConfig.systemName"
              class="h-10 w-10 shrink-0"
            />
            <span class="text-base font-semibold a-color-text">{{
              systemConfig.systemName
            }}</span>
          </div>

          <button
            class="ml-auto h-10 w-10 inline-grid place-items-center border border-solid rounded-lg a-border-border a-bg-container a-color-text-secondary text-lg cursor-pointer transition-colors hover:text-primary hover:border-primary hover:a-bg-fill-tertiary"
            type="button"
            :title="isDark ? '切换浅色主题' : '切换深色主题'"
            :aria-label="isDark ? '切换浅色主题' : '切换深色主题'"
            @click="toggleTheme"
          >
            <AppIcon :icon="isDark ? 'i-ri:sun-line' : 'i-ri:moon-line'" />
          </button>
        </div>

        <header class="mb-8">
          <h2 class="m-0 text-3xl font-semibold leading-tight a-color-text">
            欢迎回来
          </h2>
          <p class="mb-0 mt-3 text-sm a-color-text-secondary">
            登录 {{ systemConfig.systemName }} 管理工作台
          </p>
        </header>

        <a-form
          :model="form"
          :rules="rules"
          class="[&_.ant-form-item-label>label]:font-medium"
          layout="vertical"
          :required-mark="false"
          @finish="handleSubmit"
        >
          <a-form-item label="用户名" name="username">
            <a-input
              v-model:value="form.username"
              size="large"
              placeholder="请输入用户名"
              autocomplete="username"
              autofocus
              @update:value="clearError"
              @focus="focusField('username')"
              @blur="blurField('username')"
            >
              <template #prefix>
                <AppIcon
                  icon="i-ri:user-3-line"
                  class="mr-2 a-color-text-tertiary"
                />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item label="密码" name="password">
            <a-input-password
              v-model:value="form.password"
              size="large"
              placeholder="请输入密码"
              autocomplete="current-password"
              :visibility-toggle="passwordVisibilityToggle"
              @update:value="clearError"
              @focus="focusField('password')"
              @blur="blurField('password')"
            >
              <template #prefix>
                <AppIcon
                  icon="i-ri:lock-line"
                  class="mr-2 a-color-text-tertiary"
                />
              </template>
            </a-input-password>
          </a-form-item>

          <a-alert
            v-if="errorMessage"
            class="mb-5"
            type="error"
            :message="errorMessage"
            show-icon
            role="alert"
          />

          <a-button
            class="mt-1 h-11"
            type="primary"
            html-type="submit"
            block
            :loading="loading"
          >
            登录
          </a-button>
        </a-form>

        <a-divider class="!my-7 !text-xs a-color-text-tertiary">
          第三方登录
        </a-divider>

        <div class="grid grid-cols-3 gap-3" aria-label="第三方登录">
          <a-tooltip
            v-for="provider in thirdPartyProviders"
            :key="provider.key"
            :title="`${provider.label}登录暂未开放`"
          >
            <span class="block">
              <button
                class="h-11 w-full inline-flex items-center justify-center gap-2 border border-solid rounded-lg a-border-border a-bg-container a-color-text-tertiary text-lg cursor-not-allowed opacity-70"
                type="button"
                disabled
                :aria-label="`${provider.label}登录暂未开放`"
              >
                <AppIcon :icon="provider.icon" />
                <span class="hidden text-sm sm:inline">{{
                  provider.label
                }}</span>
              </button>
            </span>
          </a-tooltip>
        </div>

        <p class="mb-0 mt-8 text-center text-xs a-color-text-tertiary">
          仅限授权用户访问
        </p>
      </div>
    </section>
  </main>
</template>
