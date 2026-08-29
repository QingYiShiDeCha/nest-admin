<script setup lang="ts">
import { message } from 'antdv-next';
import type { FormInstance } from 'antdv-next';
import { reactive, ref } from 'vue';

import { httpPut } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/format';

const auth = useAuthStore();

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
      <a-descriptions-item label="最后登录">
        {{ formatDateTime(auth.profile?.lastLoginAt) }}
      </a-descriptions-item>
    </a-descriptions>

    <a-button class="mt-4" type="primary" @click="modalOpen = true">修改密码</a-button>

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
          <a-input-password v-model:value="form.newPassword" placeholder="至少 8 位，含字母和数字" />
        </a-form-item>
        <a-form-item label="确认新密码" name="confirmPassword">
          <a-input-password v-model:value="form.confirmPassword" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>
