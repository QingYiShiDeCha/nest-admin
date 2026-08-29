<script setup lang="ts">
import { Button, Popconfirm, Space, Tag, message } from 'antdv-next';
import type { FormInstance } from 'antdv-next';
import { h, reactive, ref } from 'vue';

import { PERMISSIONS } from '@nest-admin/shared';

import {
  apiUserCreate,
  apiUserForceLogout,
  apiUserPage,
  apiUserRemove,
  apiUserRoleIds,
  apiUserSetRoles,
  apiUserUpdate,
  type UserQuery,
} from '@/api/users';
import type { BasicUser, Role } from '@nest-admin/shared';
import { apiRolePage } from '@/api/roles';
import ProSearch from '@/components/ProSearch.vue';
import ProTable from '@/components/ProTable.vue';
import type { FilterField } from '@/components/pro-search.types';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import { STATUS_META, STATUS_OPTIONS } from '@/constants/dicts';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/format';

const auth = useAuthStore();
const { can } = usePermission();

const table = useTable<BasicUser, UserQuery>({
  columns: [
    { title: '用户名', dataIndex: 'username' },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '手机号', dataIndex: 'phone' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (_value, record) =>
        h(Tag, { color: STATUS_META[record.status].color }, () =>
          STATUS_META[record.status].label,
        ),
    },
    {
      title: '最后登录',
      key: 'lastLoginAt',
      width: 170,
      render: (_value, record) => formatDateTime(record.lastLoginAt),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_value, record) =>
        h(Space, null, {
          default: () => [
            can(PERMISSIONS.USER_UPDATE)
              ? h(
                  Button,
                  { type: 'link', size: 'small', onClick: () => openEdit(record) },
                  () => '编辑',
                )
              : null,
            can(PERMISSIONS.USER_ASSIGN_ROLE) && !isSelf(record)
              ? h(
                  Button,
                  {
                    type: 'link',
                    size: 'small',
                    onClick: () => openAssignRoles(record),
                  },
                  () => '分配角色',
                )
              : null,
            can(PERMISSIONS.USER_FORCE_LOGOUT)
              ? h(
                  Popconfirm,
                  {
                    title: '确认强制下线该用户？',
                    description: '将吊销其全部登录会话',
                    onConfirm: () => forceLogout(record),
                  },
                  {
                    default: () =>
                      h(
                        Button,
                        { type: 'link', size: 'small', danger: true },
                        () => '强制下线',
                      ),
                  },
                )
              : null,
            can(PERMISSIONS.USER_DELETE) && !isSelf(record)
              ? h(
                  Popconfirm,
                  {
                    title: '确认删除该用户？',
                    description: '删除后该账号无法登录',
                    onConfirm: () => remove(record),
                  },
                  {
                    default: () =>
                      h(
                        Button,
                        { type: 'link', size: 'small', danger: true },
                        () => '删除',
                      ),
                  },
                )
              : null,
          ],
        }),
    },
  ],
  fetcher: (query) => apiUserPage(query),
  filters: { keyword: '', status: '' },
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<UserQuery>[] = [
  { label: '用户名', key: 'keyword' },
  { label: '状态', key: 'status', type: 'select', options: STATUS_OPTIONS },
];

// ---- 新增 / 编辑 ----

const modalOpen = ref(false);
const editing = ref<BasicUser | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  status: 'active' as 'active' | 'disabled',
});

/** 与后端 CreateUserDto 的校验规则保持一致，报错文案也对齐 */
const rules = {
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 32, message: '用户名长度需在 3-32 之间' },
    {
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: '只能包含字母、数字、下划线和中划线',
    },
  ],
  password: [
    { required: true, message: '请输入密码' },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
      message: '至少 8 位，且需同时包含字母和数字',
    },
  ],
  email: [{ type: 'email' as const, message: '邮箱格式不正确' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: '',
    status: 'active',
  });
  modalOpen.value = true;
}

function openEdit(record: BasicUser): void {
  editing.value = record;
  Object.assign(form, {
    username: record.username,
    password: '',
    nickname: record.nickname ?? '',
    email: record.email ?? '',
    phone: record.phone ?? '',
    status: record.status,
  });
  modalOpen.value = true;
}

async function submit(): Promise<void> {
  await formRef.value?.validate();

  submitting.value = true;
  try {
    if (editing.value) {
      // email/phone 的空串会被后端 IsEmail/IsMobilePhone 拦下，必须转 undefined
      await apiUserUpdate(editing.value.id, {
        nickname: form.nickname || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        status: form.status,
      });
      void message.success('已保存');
    } else {
      await apiUserCreate({
        username: form.username,
        password: form.password,
        nickname: form.nickname || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        status: form.status,
      });
      void message.success('已创建');
    }

    modalOpen.value = false;
    await table.reload();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: BasicUser): Promise<void> {
  await apiUserRemove(record.id);
  void message.success(`已删除用户 ${record.username}`);
  await table.reload();
}

// ---- 分配角色 ----

const roleModalOpen = ref(false);
const roleTarget = ref<BasicUser | null>(null);
const roleOptions = ref<Role[]>([]);
const roleIds = ref<number[]>([]);
const roleSubmitting = ref(false);

/** 自己不能改自己的角色（后端同样禁止），按钮直接隐藏 */
function isSelf(record: BasicUser): boolean {
  return record.id === auth.profile?.id;
}

async function openAssignRoles(record: BasicUser): Promise<void> {
  roleTarget.value = record;
  roleModalOpen.value = true;

  try {
    const [roles, currentIds] = await Promise.all([
      // 单页上限 100：角色数不会多到需要远程搜索，超了也先展示前 100 个
      apiRolePage({ page: 1, pageSize: 100 }),
      apiUserRoleIds(record.id),
    ]);
    roleOptions.value = roles.list;
    roleIds.value = currentIds;
  } catch (error) {
    roleModalOpen.value = false;
    throw error;
  }
}

async function submitRoles(): Promise<void> {
  if (!roleTarget.value) {
    return;
  }

  roleSubmitting.value = true;
  try {
    await apiUserSetRoles(roleTarget.value.id, roleIds.value);
    void message.success('角色已更新');
    roleModalOpen.value = false;
    await table.reload();
  } finally {
    roleSubmitting.value = false;
  }
}

async function forceLogout(record: BasicUser): Promise<void> {
  const { revokedSessions } = await apiUserForceLogout(record.id);
  void message.success(
    `已下线 ${record.username} 的 ${revokedSessions} 个会话`,
  );
}

defineOptions({ name: 'UserPage' });
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <a-button
          v-permission="PERMISSIONS.USER_CREATE"
          type="primary"
          @click="openCreate"
        >
          新增用户
        </a-button>
      </template>

    </ProTable>

    <!-- 新增 / 编辑 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑用户 ${editing.username}` : '新增用户'"
      :confirm-loading="submitting"
      width="760px"
      @ok="submit"
    >
      <a-form
        ref="formRef"
        class="grid grid-cols-1 gap-x-5 md:grid-cols-2"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="form.username" :disabled="!!editing" />
        </a-form-item>
        <a-form-item v-if="!editing" label="密码" name="password">
          <a-input-password
            v-model:value="form.password"
            placeholder="至少 8 位，含字母和数字"
          />
        </a-form-item>
        <a-form-item label="昵称" name="nickname">
          <a-input v-model:value="form.nickname" />
        </a-form-item>
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="form.email" />
        </a-form-item>
        <a-form-item label="手机号" name="phone">
          <a-input v-model:value="form.phone" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group
            v-model:value="form.status"
            :options="STATUS_OPTIONS"
          />
        </a-form-item>
        <p v-if="editing" class="text-xs a-color-text-tertiary md:col-span-2">
          密码不在此处修改：本人用右上角头像菜单，管理员可强制下线后由用户自行重置
        </p>
      </a-form>
    </a-modal>

    <!-- 分配角色 -->
    <a-modal
      v-model:open="roleModalOpen"
      :title="`分配角色：${roleTarget?.username ?? ''}`"
      :confirm-loading="roleSubmitting"
      width="720px"
      @ok="submitRoles"
    >
      <a-checkbox-group
        v-model:value="roleIds"
        class="grid grid-cols-1 gap-x-5 gap-y-2 py-2 sm:grid-cols-2"
      >
        <a-checkbox v-for="role in roleOptions" :key="role.id" :value="role.id">
          {{ role.name }}
          <span class="text-xs a-color-text-tertiary">{{ role.code }}</span>
          <a-tag v-if="role.isSystem" class="ml-1" color="gold">内置</a-tag>
        </a-checkbox>
      </a-checkbox-group>
    </a-modal>
  </div>
</template>
