<script setup lang="ts">
import { App, Button, Popconfirm, Space, Tooltip } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { computed, h, reactive, ref } from 'vue';

import {
  PERMISSIONS,
  type Status,
  type SystemConfig,
  type SystemConfigValueType,
} from '@nest-admin/shared';

import {
  apiSystemConfigCreate,
  apiSystemConfigPage,
  apiSystemConfigRemove,
  apiSystemConfigUpdate,
  type SystemConfigPayload,
  type SystemConfigQuery,
} from '@/api/system-configs';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import { useSystemConfigStore } from '@/stores/system-config';
import {
  STATUS_META,
  STATUS_OPTIONS,
  SYSTEM_CONFIG_VALUE_TYPE_META,
  SYSTEM_CONFIG_VALUE_TYPE_OPTIONS,
} from '@/constants/dicts';
import { formatDateTime } from '@/utils/format';

const { message } = App.useApp();
const { can } = usePermission();
const systemConfig = useSystemConfigStore();

const columns: TableColumnsType<SystemConfig> = [
  { title: '参数名称', dataIndex: 'name', key: 'name', width: 160 },
  { title: '参数键', dataIndex: 'key', key: 'key', width: 220, ellipsis: true },
  {
    title: '参数值',
    key: 'value',
    render: (_value, record) =>
      h('span', { class: 'block truncate', title: record.value }, record.value),
  },
  {
    title: '值类型',
    key: 'valueType',
    width: 90,
    render: (_value, record) =>
      h(
        AppTag,
        { tone: SYSTEM_CONFIG_VALUE_TYPE_META[record.valueType].tone },
        () => SYSTEM_CONFIG_VALUE_TYPE_META[record.valueType].label,
      ),
  },
  {
    title: '来源',
    key: 'builtIn',
    width: 90,
    render: (_value, record) =>
      h(AppTag, { tone: record.builtIn ? 'primary' : 'default' }, () =>
        record.builtIn ? '内置' : '自定义',
      ),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (_value, record) =>
      h(
        AppTag,
        { tone: STATUS_META[record.status].color },
        () => STATUS_META[record.status].label,
      ),
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 170,
    render: (_value, record) => formatDateTime(record.updatedAt),
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    render: (_value, record) =>
      h(Space, null, {
        default: () => [
          can(PERMISSIONS.CONFIG_UPDATE)
            ? h(
                Button,
                {
                  type: 'link',
                  size: 'small',
                  onClick: () => openEdit(record),
                },
                () => '编辑',
              )
            : null,
          can(PERMISSIONS.CONFIG_DELETE) && !record.builtIn
            ? h(
                Popconfirm,
                {
                  title: '确认删除该参数？',
                  description: '删除后参数键不可复用',
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
          can(PERMISSIONS.CONFIG_DELETE) && record.builtIn
            ? h(
                Tooltip,
                { title: '内置参数不可删除' },
                {
                  default: () =>
                    h('span', null, [
                      h(
                        Button,
                        {
                          type: 'link',
                          size: 'small',
                          danger: true,
                          disabled: true,
                        },
                        () => '删除',
                      ),
                    ]),
                },
              )
            : null,
        ],
      }),
  },
];

const table = useTable<SystemConfig, SystemConfigQuery>({
  columns,
  filters: { keyword: '', valueType: '', status: '' },
  fetcher: apiSystemConfigPage,
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<SystemConfigQuery>[] = [
  { label: '关键词', key: 'keyword', placeholder: '参数名称或参数键' },
  {
    label: '值类型',
    key: 'valueType',
    type: 'select',
    options: SYSTEM_CONFIG_VALUE_TYPE_OPTIONS,
  },
  { label: '状态', key: 'status', type: 'select', options: STATUS_OPTIONS },
];

const modalOpen = ref(false);
const editing = ref<SystemConfig | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  name: '',
  key: '',
  value: '',
  valueType: 'string' as SystemConfigValueType,
  status: 'active' as Status,
  remark: '',
});

const numericValue = computed<number | null>({
  get: () => {
    if (form.value.trim() === '') return null;
    const value = Number(form.value);
    return Number.isFinite(value) ? value : null;
  },
  set: (value) => {
    form.value = value === null ? '' : String(value);
  },
});

const booleanValue = computed<boolean>({
  get: () => form.value === 'true',
  set: (value) => {
    form.value = value ? 'true' : 'false';
  },
});

const rules = {
  name: [{ required: true, message: '请输入参数名称' }],
  key: [
    { required: true, message: '请输入参数键' },
    {
      pattern: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/,
      message: '使用小写字母、数字和下划线，并以点号分段',
    },
  ],
  value: [
    {
      validator: () => validateValue(),
    },
  ],
};

function validateValue(): Promise<void> {
  if (form.valueType === 'number') {
    return form.value.trim() !== '' && Number.isFinite(Number(form.value))
      ? Promise.resolve()
      : Promise.reject(new Error('请输入有效数字'));
  }
  if (form.valueType === 'boolean') return Promise.resolve();
  if (form.valueType === 'json') {
    try {
      const value: unknown = JSON.parse(form.value);
      return typeof value === 'object' && value !== null
        ? Promise.resolve()
        : Promise.reject(new Error('JSON 必须是对象或数组'));
    } catch {
      return Promise.reject(new Error('请输入有效 JSON'));
    }
  }
  return Promise.resolve();
}

function resetForm(): void {
  Object.assign(form, {
    name: '',
    key: '',
    value: '',
    valueType: 'string',
    status: 'active',
    remark: '',
  });
}

function openCreate(): void {
  editing.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(record: SystemConfig): void {
  editing.value = record;
  Object.assign(form, {
    name: record.name,
    key: record.key,
    value: record.value,
    valueType: record.valueType,
    status: record.status,
    remark: record.remark ?? '',
  });
  modalOpen.value = true;
}

function handleValueTypeChange(value: SystemConfigValueType): void {
  if (value === 'number' && !Number.isFinite(Number(form.value))) {
    form.value = '0';
  } else if (value === 'boolean') {
    form.value = form.value === 'true' ? 'true' : 'false';
  } else if (value === 'json') {
    try {
      const parsed: unknown = JSON.parse(form.value);
      if (typeof parsed !== 'object' || parsed === null) form.value = '{}';
    } catch {
      form.value = '{}';
    }
  }
  formRef.value?.clearValidate(['value']);
}

async function submit(): Promise<void> {
  await formRef.value?.validate();

  const payload: SystemConfigPayload = {
    name: form.name,
    key: form.key,
    value: form.value,
    valueType: form.valueType,
    status: form.status,
    remark: form.remark || undefined,
  };

  submitting.value = true;
  try {
    if (editing.value) {
      await apiSystemConfigUpdate(editing.value.id, payload);
      void message.success('系统参数已更新');
    } else {
      await apiSystemConfigCreate(payload);
      void message.success('系统参数已创建');
    }
    await systemConfig.load(true);
    modalOpen.value = false;
    await table.reload();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: SystemConfig): Promise<void> {
  await apiSystemConfigRemove(record.id);
  void message.success(`已删除参数 ${record.name}`);
  await table.reload();
}

defineOptions({ name: 'SystemConfigPage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <a-button
          v-permission="PERMISSIONS.CONFIG_CREATE"
          type="primary"
          @click="openCreate"
        >
          新增参数
        </a-button>
      </template>
    </ProTable>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑参数：${editing.name}` : '新增参数'"
      :confirm-loading="submitting"
      width="820px"
      @ok="submit"
    >
      <a-form
        ref="formRef"
        class="grid grid-cols-1 gap-x-5 md:grid-cols-2"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="参数名称" name="name">
          <a-input v-model:value="form.name" :maxlength="64" />
        </a-form-item>
        <a-form-item label="参数键" name="key">
          <a-input
            v-model:value="form.key"
            :disabled="editing?.builtIn"
            :maxlength="128"
            placeholder="如 system.name"
          />
        </a-form-item>
        <a-form-item label="值类型" name="valueType">
          <a-select
            v-model:value="form.valueType"
            :options="SYSTEM_CONFIG_VALUE_TYPE_OPTIONS"
            @change="handleValueTypeChange"
          />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group
            v-model:value="form.status"
            :options="STATUS_OPTIONS"
          />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="参数值" name="value">
          <a-input-number
            v-if="form.valueType === 'number'"
            v-model:value="numericValue"
            class="w-full"
          />
          <div
            v-else-if="form.valueType === 'boolean'"
            class="h-8 flex items-center"
          >
            <a-switch
              v-model:checked="booleanValue"
              checked-children="true"
              un-checked-children="false"
            />
          </div>
          <a-textarea
            v-else-if="form.valueType === 'json'"
            v-model:value="form.value"
            class="font-mono"
            :rows="6"
            :maxlength="10000"
          />
          <a-input v-else v-model:value="form.value" :maxlength="10000" />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="备注" name="remark">
          <a-textarea v-model:value="form.remark" :rows="3" :maxlength="255" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>
