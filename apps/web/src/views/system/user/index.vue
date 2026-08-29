<script setup lang="ts">
import { message } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { reactive, ref } from 'vue';

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
import ProSearch, { type FilterField } from '@/components/ProSearch.vue';
import ProTable from '@/components/ProTable.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import { STATUS_META, STATUS_OPTIONS } from '@/constants/dicts';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/format';

const auth = useAuthStore();
const { can } = usePermission();

/**
 * 列定义用 :columns 数组 + #bodyCell 插槽。
 * 不能用 <a-table-column> 子组件里写 #default：antdv-next 会把列组件的
 * default 插槽当成「嵌套列定义」在收集列时无参调用，解构 record 直接崩。
 */
const columns: TableColumnsType<BasicUser> = [
  { title: '用户名', dataIndex: 'username' },
  { title: '昵称', dataIndex: 'nickname' },
  { title: '邮箱', dataIndex: 'email' },
  { title: '手机号', dataIndex: 'phone' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '最后登录', key: 'lastLoginAt', width: 170 },
  { title: '操作', key: 'action', width: 300 },
];

const table = useTable<BasicUser, UserQuery>({
  fetcher: (query) => apiUserPage(query),
  filters: { keyword: '', status: '' },
});

const filterFields: FilterField[] = [
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
    await table.run();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: BasicUser): Promise<void> {
  await apiUserRemove(record.id);
  void message.success(`已删除用户 ${record.username}`);
  await table.run();
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
    await table.run();
  } finally {
    roleSubmitting.value = false;
  }
}

async function forceLogout(record: BasicUser): Promise<void> {
  const { revokedSessions } = await apiUserForceLogout(record.id);
  void message.success(`已下线 ${record.username} 的 ${revokedSessions} 个会话`);
}


defineOptions({ name: 'UserPage' });
</script>

<template>
  <ProSearch :table="table" :fields="filterFields" />

  <ProTable :table="table" :columns="columns" row-key="id" :filters="filterFields">
    <template #toolbar>
      <a-button
        v-permission="PERMISSIONS.USER_CREATE"
        type="primary"
        @click="openCreate"
      >
        新增用户
      </a-button>
    </template>

    <template #bodyCell="{ column, record }: { column: { key: string }; record: BasicUser }">
      <template v-if="column.key === 'status'">
        <a-tag :color="STATUS_META[record.status].color">
          {{ STATUS_META[record.status].label }}
        </a-tag>
      </template>
      <template v-else-if="column.key === 'lastLoginAt'">
        {{ formatDateTime(record.lastLoginAt) }}
      </template>
      <template v-else-if="column.key === 'action'">
        <a-space>
          <a-button
            v-permission="PERMISSIONS.USER_UPDATE"
            type="link"
            size="small"
            @click="openEdit(record)"
          >
            编辑
          </a-button>
          <a-button
            v-if="can(PERMISSIONS.USER_ASSIGN_ROLE) && !isSelf(record)"
            type="link"
            size="small"
            @click="openAssignRoles(record)"
          >
            分配角色
          </a-button>
          <a-popconfirm
            v-if="can(PERMISSIONS.USER_FORCE_LOGOUT)"
            title="确认强制下线该用户？"
            description="将吊销其全部登录会话"
            @confirm="forceLogout(record)"
          >
            <a-button type="link" size="small" danger>强制下线</a-button>
          </a-popconfirm>
          <a-popconfirm
            v-if="can(PERMISSIONS.USER_DELETE) && !isSelf(record)"
            title="确认删除该用户？"
            description="删除后该账号无法登录"
            @confirm="remove(record)"
          >
            <a-button type="link" size="small" danger>删除</a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </template>
  </ProTable>

  <!-- 新增 / 编辑 -->
  <a-modal
    v-model:open="modalOpen"
    :title="editing ? `编辑用户 ${editing.username}` : '新增用户'"
    :confirm-loading="submitting"
    @ok="submit"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="用户名" name="username">
        <a-input v-model:value="form.username" :disabled="!!editing" />
      </a-form-item>
      <a-form-item v-if="!editing" label="密码" name="password">
        <a-input-password v-model:value="form.password" placeholder="至少 8 位，含字母和数字" />
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
        <a-radio-group v-model:value="form.status" :options="STATUS_OPTIONS" />
      </a-form-item>
      <p v-if="editing" class="text-xs text-gray-400">
        密码不在此处修改：本人用右上角头像菜单，管理员可强制下线后由用户自行重置
      </p>
    </a-form>
  </a-modal>

  <!-- 分配角色 -->
  <a-modal
    v-model:open="roleModalOpen"
    :title="`分配角色：${roleTarget?.username ?? ''}`"
    :confirm-loading="roleSubmitting"
    @ok="submitRoles"
  >
    <a-checkbox-group v-model:value="roleIds" class="flex flex-col gap-2 py-2">
      <a-checkbox v-for="role in roleOptions" :key="role.id" :value="role.id">
        {{ role.name }}
        <span class="text-xs text-gray-400">{{ role.code }}</span>
        <a-tag v-if="role.isSystem" class="ml-1" color="gold">内置</a-tag>
      </a-checkbox>
    </a-checkbox-group>
  </a-modal>
</template>
