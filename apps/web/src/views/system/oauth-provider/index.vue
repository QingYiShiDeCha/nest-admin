<script setup lang="ts">
import { App, Button, Popconfirm, Space } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { h, reactive, ref } from 'vue';

import {
  OAUTH_PROVIDER_KEYS,
  OAUTH_PROVIDER_META,
  PERMISSIONS,
  type OAuthProvider,
  type OAuthProviderKey,
} from '@nest-admin/shared';

import {
  apiOAuthProviderCreate,
  apiOAuthProviderPage,
  apiOAuthProviderRemove,
  apiOAuthProviderUpdate,
  type OAuthProviderQuery,
} from '@/api/oauth';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import { formatDateTime } from '@/utils/format';

const { message } = App.useApp();
const { can } = usePermission();

const columns: TableColumnsType<OAuthProvider> = [
  {
    title: '提供商',
    key: 'name',
    width: 150,
    render: (_value, record) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('i', { class: OAUTH_PROVIDER_META[record.key].icon }),
        h('span', record.name),
      ]),
  },
  { title: '标识', dataIndex: 'key', key: 'key', width: 120 },
  {
    title: '状态',
    key: 'enabled',
    width: 90,
    render: (_value, record) =>
      h(AppTag, { tone: record.enabled ? 'success' : 'default' }, () =>
        record.enabled ? '已启用' : '未启用',
      ),
  },
  {
    title: '自动注册',
    key: 'autoRegister',
    width: 100,
    render: (_value, record) => (record.autoRegister ? '允许' : '关闭'),
  },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 70 },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 180,
    render: (_value, record) => formatDateTime(record.updatedAt),
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    render: (_value, record) =>
      h(Space, { size: 0 }, () => [
        can(PERMISSIONS.OAUTH_PROVIDER_UPDATE)
          ? h(
              Button,
              { type: 'link', size: 'small', onClick: () => openEdit(record) },
              () => '编辑',
            )
          : null,
        can(PERMISSIONS.OAUTH_PROVIDER_DELETE)
          ? h(
              Popconfirm,
              {
                title: '确认删除该 OAuth 提供商？',
                onConfirm: () => remove(record),
              },
              {
                default: () =>
                  h(Button, { type: 'link', size: 'small', danger: true }, () =>
                    '删除',
                  ),
              },
            )
          : null,
      ]),
  },
];

const table = useTable<OAuthProvider, OAuthProviderQuery>({
  columns,
  filters: {},
  fetcher: apiOAuthProviderPage,
  onError: (text) => void message.error(text),
});

const modalOpen = ref(false);
const editing = ref<OAuthProvider | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  key: 'github' as OAuthProviderKey,
  name: 'GitHub',
  clientId: '',
  clientSecret: '',
  authorizationUrl: '',
  tokenUrl: '',
  userInfoUrl: '',
  scopes: '',
  enabled: false,
  autoRegister: false,
  sort: 0,
});

const rules = {
  key: [{ required: true, message: '请选择提供商' }],
  name: [{ required: true, message: '请输入展示名称' }],
  clientId: [{ required: true, message: '请输入客户端 ID' }],
  clientSecret: [
    {
      validator: () =>
        editing.value || form.clientSecret
          ? Promise.resolve()
          : Promise.reject(new Error('请输入客户端密钥')),
    },
  ],
};

function resetForm(): void {
  Object.assign(form, {
    key: 'github',
    name: 'GitHub',
    clientId: '',
    clientSecret: '',
    authorizationUrl: '',
    tokenUrl: '',
    userInfoUrl: '',
    scopes: '',
    enabled: false,
    autoRegister: false,
    sort: 0,
  });
}

function openCreate(): void {
  editing.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(record: OAuthProvider): void {
  editing.value = record;
  Object.assign(form, {
    key: record.key,
    name: record.name,
    clientId: record.clientId,
    clientSecret: '',
    authorizationUrl: record.authorizationUrl,
    tokenUrl: record.tokenUrl,
    userInfoUrl: record.userInfoUrl,
    scopes: record.scopes.join(', '),
    enabled: record.enabled,
    autoRegister: record.autoRegister,
    sort: record.sort,
  });
  modalOpen.value = true;
}

async function submit(): Promise<void> {
  await formRef.value?.validate();
  const payload = {
    key: form.key,
    name: form.name,
    clientId: form.clientId,
    ...(form.clientSecret ? { clientSecret: form.clientSecret } : {}),
    authorizationUrl: form.authorizationUrl || undefined,
    tokenUrl: form.tokenUrl || undefined,
    userInfoUrl: form.userInfoUrl || undefined,
    scopes: form.scopes
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
    enabled: form.enabled,
    autoRegister: form.autoRegister,
    sort: form.sort,
  };
  submitting.value = true;
  try {
    if (editing.value) {
      await apiOAuthProviderUpdate(editing.value.id, payload);
      void message.success('OAuth 提供商已更新');
    } else {
      await apiOAuthProviderCreate({ ...payload, clientSecret: form.clientSecret });
      void message.success('OAuth 提供商已创建');
    }
    modalOpen.value = false;
    await table.reload();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: OAuthProvider): Promise<void> {
  await apiOAuthProviderRemove(record.id);
  void message.success(`已删除 ${record.name}`);
  await table.reload();
}

function updateProviderKey(value: OAuthProviderKey): void {
  form.key = value;
  if (!editing.value) {
    form.name = OAUTH_PROVIDER_META[value].label;
  }
}

defineOptions({ name: 'OAuthProviderPage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4">
    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <a-button
          v-permission="PERMISSIONS.OAUTH_PROVIDER_CREATE"
          type="primary"
          @click="openCreate"
        >
          新增提供商
        </a-button>
      </template>
    </ProTable>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑提供商：${editing.name}` : '新增 OAuth 提供商'"
      :confirm-loading="submitting"
      width="860px"
      @ok="submit"
    >
      <a-form
        ref="formRef"
        class="grid grid-cols-1 gap-x-5 md:grid-cols-2"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="提供商" name="key">
          <a-select
            :value="form.key"
            :disabled="Boolean(editing)"
            :options="OAUTH_PROVIDER_KEYS.map((key) => ({ label: OAUTH_PROVIDER_META[key].label, value: key }))"
            @update:value="updateProviderKey"
          />
        </a-form-item>
        <a-form-item label="展示名称" name="name">
          <a-input v-model:value="form.name" :maxlength="64" />
        </a-form-item>
        <a-form-item label="客户端 ID" name="clientId">
          <a-input v-model:value="form.clientId" :maxlength="255" />
        </a-form-item>
        <a-form-item label="客户端密钥" name="clientSecret">
          <a-input-password
            v-model:value="form.clientSecret"
            :placeholder="editing ? '留空保持原密钥' : '请输入客户端密钥'"
          />
        </a-form-item>
        <a-form-item label="授权地址">
          <a-input v-model:value="form.authorizationUrl" />
        </a-form-item>
        <a-form-item label="令牌地址">
          <a-input v-model:value="form.tokenUrl" />
        </a-form-item>
        <a-form-item label="用户信息地址">
          <a-input v-model:value="form.userInfoUrl" />
        </a-form-item>
        <a-form-item label="授权范围">
          <a-input v-model:value="form.scopes" placeholder="多个范围用逗号或空格分隔" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="form.sort" class="w-full" :min="0" />
        </a-form-item>
        <a-form-item label="状态">
          <a-switch v-model:checked="form.enabled" checked-children="启用" un-checked-children="停用" />
        </a-form-item>
        <a-form-item label="自动注册">
          <a-switch v-model:checked="form.autoRegister" checked-children="允许" un-checked-children="关闭" />
        </a-form-item>
      </a-form>
      <a-alert
        class="mt-2"
        type="info"
        show-icon
        message="回调地址"
        :description="`请在第三方平台配置：${'http://localhost:3100/api/auth/oauth'}/${form.key}/callback`"
      />
    </a-modal>
  </section>
</template>
