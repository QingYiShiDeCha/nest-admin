<script setup lang="ts">
import { message } from 'antdv-next';
import type { FormInstance } from 'antdv-next';
import { computed, reactive, ref } from 'vue';

import { apiUploadFile } from '@/api/files';
import { ApiError, httpPut } from '@/api/http';
import { apiUpdateOwnAvatar } from '@/api/users';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/format';
import { resolveImageUrl } from '@/utils/image-url';

const auth = useAuthStore();
const avatarSrc = computed(() => resolveImageUrl(auth.profile?.avatar));

const avatarInput = ref<HTMLInputElement | null>(null);
const avatarSubmitting = ref(false);
const avatarMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function openAvatarPicker(): void {
  avatarInput.value?.click();
}

async function handleAvatarChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const [file] = Array.from(input.files ?? []);
  input.value = '';

  if (!file) {
    return;
  }

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
    await apiUpdateOwnAvatar(uploaded.url);
    await auth.loadProfile();
    void message.success('头像已更新');
  } catch (error) {
    void message.error(
      error instanceof ApiError ? error.message : '头像更新失败，请稍后重试',
    );
  } finally {
    avatarSubmitting.value = false;
  }
}

// ---- 修改自己的密码 ----

const modalOpen = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const rules = {
  oldPassword: [{ required: true, message: '请输入当前密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
      message: '至少 8 位，且需同时包含字母和数字',
    },
  ],
  confirmPassword: [
    {
      validator: (_rule: unknown, value: string) =>
        value === form.newPassword
          ? Promise.resolve()
          : Promise.reject(new Error('两次输入的密码不一致')),
    },
  ],
};

async function submit(): Promise<void> {
  await formRef.value?.validate();

  submitting.value = true;
  try {
    await httpPut('/users/me/password', {
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    });
    void message.success('密码已修改，其他设备需重新登录');
    modalOpen.value = false;
  } finally {
    submitting.value = false;
  }
}

defineOptions({ name: 'ProfilePage' });
</script>

<template>
  <a-card title="个人中心">
    <div class="mb-6 flex items-center gap-4">
      <a-avatar :size="80" :src="avatarSrc" alt="用户头像">
        <template #icon>
          <AppIcon icon="i-ri:user-3-line" alt="默认用户头像" />
        </template>
      </a-avatar>
      <div class="flex flex-col items-start gap-2">
        <div class="text-base font-medium">头像</div>
        <div class="text-sm a-color-text-secondary">
          支持 JPG、PNG、GIF、WEBP，大小不超过 5 MB
        </div>
        <input
          ref="avatarInput"
          class="hidden"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          @change="handleAvatarChange"
        />
        <a-button :loading="avatarSubmitting" @click="openAvatarPicker">
          <template #icon>
            <AppIcon icon="i-ri:upload-2-line" />
          </template>
          修改头像
        </a-button>
      </div>
    </div>

    <a-descriptions :column="1" bordered>
      <a-descriptions-item label="用户名">{{
        auth.username
      }}</a-descriptions-item>
      <a-descriptions-item label="昵称">
        {{ auth.profile?.nickname ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="邮箱">
        {{ auth.profile?.email ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="角色">
        {{ auth.roles.join('、') || '无' }}
      </a-descriptions-item>
      <a-descriptions-item label="最后登录">
        {{ formatDateTime(auth.profile?.lastLoginAt) }}
      </a-descriptions-item>
    </a-descriptions>

    <a-button class="mt-4" type="primary" @click="modalOpen = true"
      >修改密码</a-button
    >

    <a-modal
      v-model:open="modalOpen"
      title="修改密码"
      :confirm-loading="submitting"
      @ok="submit"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="当前密码" name="oldPassword">
          <a-input-password v-model:value="form.oldPassword" />
        </a-form-item>
        <a-form-item label="新密码" name="newPassword">
          <a-input-password
            v-model:value="form.newPassword"
            placeholder="至少 8 位，含字母和数字"
          />
        </a-form-item>
        <a-form-item label="确认新密码" name="confirmPassword">
          <a-input-password v-model:value="form.confirmPassword" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>
