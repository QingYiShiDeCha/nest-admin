<script setup lang="ts">
import { App, Button, Popconfirm, Space, Tooltip } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { h, reactive, ref } from 'vue';

import {
  PERMISSIONS,
  type PostListItem,
  type Status,
} from '@nest-admin/shared';

import {
  apiPostCreate,
  apiPostPage,
  apiPostRemove,
  apiPostUpdate,
  type PostPayload,
  type PostQuery,
} from '@/api/posts';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import { STATUS_META, STATUS_OPTIONS } from '@/constants/dicts';

const { message } = App.useApp();
const { can } = usePermission();

const columns: TableColumnsType<PostListItem> = [
  { title: '岗位名称', dataIndex: 'name', key: 'name', width: 180 },
  { title: '岗位编码', dataIndex: 'code', key: 'code', width: 180 },
  {
    title: '用户数',
    dataIndex: 'userCount',
    key: 'userCount',
    width: 90,
    align: 'center',
  },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
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
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  {
    title: '操作',
    key: 'action',
    width: 160,
    render: (_value, record) =>
      h(Space, null, {
        default: () => [
          can(PERMISSIONS.POST_UPDATE)
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
          can(PERMISSIONS.POST_DELETE) && record.userCount === 0
            ? h(
                Popconfirm,
                {
                  title: '确认删除该岗位？',
                  description: '删除后岗位编码不可复用',
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
          can(PERMISSIONS.POST_DELETE) && record.userCount > 0
            ? h(
                Tooltip,
                { title: '该岗位仍有用户，请先解除分配' },
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

const table = useTable<PostListItem, PostQuery>({
  columns,
  filters: { keyword: '', status: '' },
  fetcher: apiPostPage,
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<PostQuery>[] = [
  { label: '关键词', key: 'keyword', placeholder: '岗位名称或编码' },
  { label: '状态', key: 'status', type: 'select', options: STATUS_OPTIONS },
];

const modalOpen = ref(false);
const editing = ref<PostListItem | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  code: '',
  name: '',
  sort: 0,
  status: 'active' as Status,
  remark: '',
});

const rules = {
  code: [
    { required: true, message: '请输入岗位编码' },
    {
      pattern: /^[a-z][a-z0-9_]*$/,
      message: '以小写字母开头，只能包含小写字母、数字和下划线',
    },
  ],
  name: [{ required: true, message: '请输入岗位名称' }],
};

function resetForm(): void {
  Object.assign(form, {
    code: '',
    name: '',
    sort: 0,
    status: 'active',
    remark: '',
  });
}

function openCreate(): void {
  editing.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(record: PostListItem): void {
  editing.value = record;
  Object.assign(form, {
    code: record.code,
    name: record.name,
    sort: record.sort,
    status: record.status,
    remark: record.remark ?? '',
  });
  modalOpen.value = true;
}

async function submit(): Promise<void> {
  await formRef.value?.validate();

  const payload: PostPayload = {
    code: form.code,
    name: form.name,
    sort: form.sort,
    status: form.status,
    remark: form.remark || undefined,
  };

  submitting.value = true;
  try {
    if (editing.value) {
      await apiPostUpdate(editing.value.id, payload);
      void message.success('岗位已更新');
    } else {
      await apiPostCreate(payload);
      void message.success('岗位已创建');
    }
    modalOpen.value = false;
    await table.reload();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: PostListItem): Promise<void> {
  await apiPostRemove(record.id);
  void message.success(`已删除岗位 ${record.name}`);
  await table.reload();
}

defineOptions({ name: 'PostPage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <a-button
            v-permission="PERMISSIONS.POST_CREATE"
            type="primary"
            class="shrink-0"
            @click="openCreate"
          >
            新增岗位
          </a-button>
          <span class="min-w-0 truncate text-sm a-color-text-tertiary">
            停用岗位不可新增分配，已有用户关系会保留
          </span>
        </div>
      </template>
    </ProTable>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑岗位：${editing.name}` : '新增岗位'"
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
        <a-form-item label="岗位编码" name="code">
          <a-input
            v-model:value="form.code"
            :maxlength="64"
            placeholder="如 product_manager"
          />
        </a-form-item>
        <a-form-item label="岗位名称" name="name">
          <a-input v-model:value="form.name" :maxlength="64" />
        </a-form-item>
        <a-form-item label="排序" name="sort">
          <a-input-number
            v-model:value="form.sort"
            :min="0"
            :max="9999"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group
            v-model:value="form.status"
            :options="STATUS_OPTIONS"
          />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="备注" name="remark">
          <a-textarea
            v-model:value="form.remark"
            :rows="3"
            :maxlength="255"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>
