<script setup lang="ts">
import { App } from 'antdv-next';
import type { FormInstance } from 'antdv-next';
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { apiUploadFile } from '@/api/files';
import { ApiError, httpPut } from '@/api/http';
import { apiUpdateOwnAvatar, apiUpdateOwnProfile } from '@/api/users';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import AppTag from '@/components/core/base/app-tag/index.vue';
import { usePageRefresh } from '@/composables/use-page-refresh';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/format';
import { resolveImageUrl } from '@/utils/image-url';

const { message } = App.useApp();
const router = useRouter();
const auth = useAuthStore();
usePageRefresh(() => auth.loadProfile());

const avatarSrc = computed(() => resolveImageUrl(auth.profile?.avatar));
const displayName = computed(
  () => auth.profile?.nickname?.trim() || auth.username || '未命名用户',
);
const accountStatus = computed(() => auth.profile?.status ?? 'active');

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

// ---- 头像 ----

const avatarInput = ref<HTMLInputElement | null>(null);
const avatarSubmitting = ref(false);
const avatarMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function openAvatarPicker(): void {
  avatarInput.value?.click();
}

async function saveAvatar(avatar: string | null): Promise<void> {
  await apiUpdateOwnAvatar(avatar);
  await auth.loadProfile();
}

async function handleAvatarChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const [file] = Array.from(input.files ?? []);
  input.value = '';

  if (!file) return;

  if (!avatarMimeTypes.includes(file.type)) {
    void message.error('仅支持 JPG、PNG、GIF 和 WEBP 图片');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    void message.error('头像大小不能超过 5 MB');
    return;
  }

  avatarSubmitting.value = true;
  try {
    const uploaded = await apiUploadFile(file);
    await saveAvatar(uploaded.url);
    void message.success('头像已更新');
  } catch (error) {
    void message.error(errorText(error, '头像更新失败，请稍后重试'));
  } finally {
    avatarSubmitting.value = false;
  }
}

async function resetAvatar(): Promise<void> {
  avatarSubmitting.value = true;
  try {
    await saveAvatar(null);
    void message.success('已恢复默认头像');
  } catch (error) {
    void message.error(errorText(error, '头像重置失败，请稍后重试'));
  } finally {
    avatarSubmitting.value = false;
  }
}

// ---- 个人资料 ----

const profileFormRef = ref<FormInstance>();
const profileSubmitting = ref(false);
const profileForm = reactive({ nickname: '', email: '', phone: '' });
const profileRules = {
  nickname: [{ max: 32, message: '昵称长度不能超过 32 位' }],
  email: [{ type: 'email' as const, message: '邮箱格式不正确' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }],
};

function normalizedProfileForm() {
  return {
    nickname: profileForm.nickname.trim(),
    email: profileForm.email.trim(),
    phone: profileForm.phone.trim(),
  };
}

function profileValue(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function resetProfileForm(): void {
  Object.assign(profileForm, {
    nickname: profileValue(auth.profile?.nickname),
    email: profileValue(auth.profile?.email),
    phone: profileValue(auth.profile?.phone),
  });
  profileFormRef.value?.clearValidate();
}

watch(() => auth.profile, resetProfileForm, { immediate: true });

const profileDirty = computed(() => {
  const current = normalizedProfileForm();
  return (
    current.nickname !== profileValue(auth.profile?.nickname) ||
    current.email !== profileValue(auth.profile?.email) ||
    current.phone !== profileValue(auth.profile?.phone)
  );
});

async function submitProfile(): Promise<void> {
  profileSubmitting.value = true;
  try {
    const current = normalizedProfileForm();
    await apiUpdateOwnProfile({
      nickname: current.nickname || null,
      email: current.email || null,
      phone: current.phone || null,
    });
    await auth.loadProfile();
    void message.success('个人资料已保存');
  } catch (error) {
    void message.error(errorText(error, '个人资料保存失败，请稍后重试'));
  } finally {
    profileSubmitting.value = false;
  }
}

// ---- 密码 ----

const passwordModalOpen = ref(false);
const passwordSubmitting = ref(false);
const passwordFormRef = ref<FormInstance>();
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入当前密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
      message: '至少 8 位，且需同时包含字母和数字',
    },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码' },
    {
      validator: (_rule: unknown, value: string) =>
        value === passwordForm.newPassword
          ? Promise.resolve()
          : Promise.reject(new Error('两次输入的密码不一致')),
    },
  ],
};

function openPasswordModal(): void {
  Object.assign(passwordForm, {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  passwordFormRef.value?.clearValidate();
  passwordModalOpen.value = true;
}

async function submitPassword(): Promise<void> {
  try {
    await passwordFormRef.value?.validate();
  } catch {
    return;
  }

  passwordSubmitting.value = true;
  try {
    await httpPut('/users/me/password', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });
    void message.success('密码已修改，请重新登录');
    passwordModalOpen.value = false;
    await auth.logout();
    await router.replace('/login');
  } catch (error) {
    void message.error(errorText(error, '密码修改失败，请稍后重试'));
  } finally {
    passwordSubmitting.value = false;
  }
}

defineOptions({ name: 'ProfilePage' });
</script>

<template>
  <div
    class="grid min-h-0 grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]"
  >
    <a-card>
      <div class="flex flex-col items-center text-center">
        <a-avatar :size="96" :src="avatarSrc" alt="用户头像">
          <template #icon>
            <AppIcon
              icon="i-ri:user-3-line"
              alt="默认用户头像"
              class="text-5xl"
            />
          </template>
        </a-avatar>

        <div class="mt-4 text-xl font-semibold a-color-text">
          {{ displayName }}
        </div>
        <div class="mt-1 text-sm a-color-text-secondary">
          {{ auth.username }}
        </div>

        <div class="mt-3 flex flex-wrap justify-center gap-1.5">
          <AppTag :tone="accountStatus === 'active' ? 'success' : 'warning'">
            {{ accountStatus === 'active' ? '账号启用' : '账号停用' }}
          </AppTag>
          <AppTag v-for="role in auth.roles" :key="role" tone="primary">
            {{ role }}
          </AppTag>
          <AppTag v-if="auth.roles.length === 0">未分配角色</AppTag>
        </div>

        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <input
            ref="avatarInput"
            class="hidden"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            @change="handleAvatarChange"
          />
          <a-button :loading="avatarSubmitting" @click="openAvatarPicker">
            <template #icon><AppIcon icon="i-ri:upload-2-line" /></template>
            修改头像
          </a-button>
          <a-popconfirm
            v-if="auth.profile?.avatar"
            title="确认恢复默认头像？"
            @confirm="resetAvatar"
          >
            <a-button :disabled="avatarSubmitting">
              <template #icon><AppIcon icon="i-ri:delete-bin-line" /></template>
              移除
            </a-button>
          </a-popconfirm>
        </div>

        <div
          class="mt-6 w-full border-t border-solid a-border-border-secondary"
        >
          <dl class="m-0 grid grid-cols-1 gap-4 pt-5 text-left text-sm">
            <div>
              <dt class="a-color-text-tertiary">最后登录</dt>
              <dd class="m-0 mt-1 a-color-text">
                {{ formatDateTime(auth.profile?.lastLoginAt) }}
              </dd>
            </div>
            <div>
              <dt class="a-color-text-tertiary">注册时间</dt>
              <dd class="m-0 mt-1 a-color-text">
                {{ formatDateTime(auth.profile?.createdAt) }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </a-card>

    <div class="flex min-w-0 flex-col gap-4">
      <a-card title="个人资料">
        <a-form
          ref="profileFormRef"
          class="max-w-2xl"
          :model="profileForm"
          :rules="profileRules"
          layout="vertical"
          @finish="submitProfile"
        >
          <a-form-item label="用户名">
            <a-input :value="auth.username" disabled>
              <template #prefix><AppIcon icon="i-ri:user-line" /></template>
            </a-input>
          </a-form-item>

          <a-form-item label="昵称" name="nickname">
            <a-input
              v-model:value="profileForm.nickname"
              :maxlength="32"
              placeholder="请输入昵称"
              allow-clear
            >
              <template #prefix><AppIcon icon="i-ri:id-card-line" /></template>
            </a-input>
          </a-form-item>

          <a-form-item label="邮箱" name="email">
            <a-input
              v-model:value="profileForm.email"
              :maxlength="128"
              placeholder="请输入邮箱"
              allow-clear
            >
              <template #prefix><AppIcon icon="i-ri:mail-line" /></template>
            </a-input>
          </a-form-item>

          <a-form-item label="手机号" name="phone">
            <a-input
              v-model:value="profileForm.phone"
              :maxlength="20"
              placeholder="请输入手机号"
              allow-clear
            >
              <template #prefix><AppIcon icon="i-ri:phone-line" /></template>
            </a-input>
          </a-form-item>

          <div class="flex flex-wrap gap-2">
            <a-button
              type="primary"
              html-type="submit"
              :loading="profileSubmitting"
              :disabled="!profileDirty"
            >
              <template #icon><AppIcon icon="i-ri:save-line" /></template>
              保存资料
            </a-button>
            <a-button
              :disabled="!profileDirty || profileSubmitting"
              @click="resetProfileForm"
            >
              <template #icon><AppIcon icon="i-ri:reset-left-line" /></template>
              重置
            </a-button>
          </div>
        </a-form>
      </a-card>

      <a-card title="账号安全">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="grid h-10 w-10 shrink-0 place-items-center rounded-md a-bg-fill-tertiary text-xl text-primary"
            >
              <AppIcon icon="i-ri:lock-password-line" />
            </div>
            <div class="min-w-0">
              <div class="font-medium a-color-text">登录密码</div>
              <div class="mt-1 text-sm a-color-text-secondary">
                修改后所有设备需要重新登录
              </div>
            </div>
          </div>
          <a-button @click="openPasswordModal">
            <template #icon><AppIcon icon="i-ri:key-2-line" /></template>
            修改密码
          </a-button>
        </div>
      </a-card>
    </div>

    <a-modal
      v-model:open="passwordModalOpen"
      title="修改密码"
      :confirm-loading="passwordSubmitting"
      @ok="submitPassword"
    >
      <a-alert
        class="mb-4"
        type="warning"
        show-icon
        message="修改成功后将退出所有登录设备"
      />
      <a-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        layout="vertical"
      >
        <a-form-item label="当前密码" name="oldPassword">
          <a-input-password
            v-model:value="passwordForm.oldPassword"
            autocomplete="current-password"
          />
        </a-form-item>
        <a-form-item label="新密码" name="newPassword">
          <a-input-password
            v-model:value="passwordForm.newPassword"
            placeholder="至少 8 位，含字母和数字"
            autocomplete="new-password"
          />
        </a-form-item>
        <a-form-item label="确认新密码" name="confirmPassword">
          <a-input-password
            v-model:value="passwordForm.confirmPassword"
            autocomplete="new-password"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
