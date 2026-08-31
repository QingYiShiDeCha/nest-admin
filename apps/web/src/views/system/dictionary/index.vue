<script setup lang="ts">
import { App, Button, Popconfirm, Space } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { h, reactive, ref } from 'vue';

import {
  PERMISSIONS,
  type DictionaryItem,
  type DictionaryTone,
  type DictionaryType,
  type Status,
} from '@nest-admin/shared';

import {
  apiDictionaryItemCreate,
  apiDictionaryItemRemove,
  apiDictionaryItems,
  apiDictionaryItemUpdate,
  apiDictionaryTypeCreate,
  apiDictionaryTypePage,
  apiDictionaryTypeRemove,
  apiDictionaryTypeUpdate,
  type DictionaryItemPayload,
  type DictionaryItemQuery,
  type DictionaryTypePayload,
  type DictionaryTypeQuery,
} from '@/api/dictionaries';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import {
  DICTIONARY_TONE_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/constants/dicts';

const { message } = App.useApp();
const { can } = usePermission();
const selectedType = ref<DictionaryType | null>(null);

const typeColumns: TableColumnsType<DictionaryType> = [
  { title: '字典名称', dataIndex: 'name', key: 'name', width: 140 },
  {
    title: '字典编码',
    dataIndex: 'code',
    key: 'code',
    width: 190,
    ellipsis: true,
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (_value, record) =>
      h(
        AppTag,
        { tone: STATUS_META[record.status].color },
        () => STATUS_META[record.status].label,
      ),
  },
  {
    title: '操作',
    key: 'action',
    width: 190,
    fixed: 'right',
    render: (_value, record) =>
      h(
        Space,
        { size: 0 },
        {
          default: () => [
            h(
              Button,
              {
                type: 'link',
                size: 'small',
                onClick: () => selectType(record),
              },
              () => '字典项',
            ),
            can(PERMISSIONS.DICT_UPDATE)
              ? h(
                  Button,
                  {
                    type: 'link',
                    size: 'small',
                    onClick: () => openTypeEdit(record),
                  },
                  () => '编辑',
                )
              : null,
            can(PERMISSIONS.DICT_DELETE)
              ? h(
                  Popconfirm,
                  {
                    title: '确认删除该字典类型？',
                    description: '所属字典项会同时删除，编码和值不可复用',
                    onConfirm: () => removeType(record),
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
        },
      ),
  },
];

const typeTable = useTable<DictionaryType, DictionaryTypeQuery>({
  columns: typeColumns,
  filters: { keyword: '', status: '' },
  fetcher: apiDictionaryTypePage,
  onError: (text) => void message.error(text),
});

const typeFilterFields: FilterField<DictionaryTypeQuery>[] = [
  { label: '关键词', key: 'keyword', placeholder: '字典名称或编码' },
  { label: '状态', key: 'status', type: 'select', options: STATUS_OPTIONS },
];

const itemColumns: TableColumnsType<DictionaryItem> = [
  { title: '显示文本', dataIndex: 'label', key: 'label', width: 130 },
  { title: '业务值', dataIndex: 'value', key: 'value', width: 150 },
  {
    title: '预览',
    key: 'tone',
    width: 100,
    render: (_value, record) =>
      h(AppTag, { tone: record.tone ?? 'default' }, () => record.label),
  },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 70 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (_value, record) =>
      h(
        AppTag,
        { tone: STATUS_META[record.status].color },
        () => STATUS_META[record.status].label,
      ),
  },
  {
    title: '操作',
    key: 'action',
    width: 130,
    fixed: 'right',
    render: (_value, record) =>
      h(
        Space,
        { size: 0 },
        {
          default: () => [
            can(PERMISSIONS.DICT_UPDATE)
              ? h(
                  Button,
                  {
                    type: 'link',
                    size: 'small',
                    onClick: () => openItemEdit(record),
                  },
                  () => '编辑',
                )
              : null,
            can(PERMISSIONS.DICT_DELETE)
              ? h(
                  Popconfirm,
                  {
                    title: '确认删除该字典项？',
                    description: '删除后该业务值不可复用',
                    onConfirm: () => removeItem(record),
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
        },
      ),
  },
];

const itemTable = useTable<DictionaryItem, DictionaryItemQuery>({
  columns: itemColumns,
  pagination: false,
  filters: { keyword: '', status: '' },
  fetcher: (query) =>
    selectedType.value
      ? apiDictionaryItems(selectedType.value.id, query)
      : Promise.resolve([]),
  onError: (text) => void message.error(text),
});

const itemFilterFields: FilterField<DictionaryItemQuery>[] = [
  { label: '关键词', key: 'keyword', placeholder: '显示文本或业务值' },
  { label: '状态', key: 'status', type: 'select', options: STATUS_OPTIONS },
];

async function selectType(record: DictionaryType): Promise<void> {
  selectedType.value = record;
  await itemTable.reset();
}

const typeModalOpen = ref(false);
const editingType = ref<DictionaryType | null>(null);
const typeSubmitting = ref(false);
const typeFormRef = ref<FormInstance>();
const typeForm = reactive({
  name: '',
  code: '',
  status: 'active' as Status,
  remark: '',
});

const typeRules = {
  name: [{ required: true, message: '请输入字典名称' }],
  code: [
    { required: true, message: '请输入字典编码' },
    {
      pattern: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
      message: '使用小写字母、数字和下划线，可用点号分段',
    },
  ],
};

function resetTypeForm(): void {
  Object.assign(typeForm, {
    name: '',
    code: '',
    status: 'active',
    remark: '',
  });
}

function openTypeCreate(): void {
  editingType.value = null;
  resetTypeForm();
  typeModalOpen.value = true;
}

function openTypeEdit(record: DictionaryType): void {
  editingType.value = record;
  Object.assign(typeForm, {
    name: record.name,
    code: record.code,
    status: record.status,
    remark: record.remark ?? '',
  });
  typeModalOpen.value = true;
}

async function submitType(): Promise<void> {
  await typeFormRef.value?.validate();
  const payload: DictionaryTypePayload = {
    name: typeForm.name,
    code: typeForm.code,
    status: typeForm.status,
    remark: typeForm.remark || undefined,
  };

  typeSubmitting.value = true;
  try {
    const result = editingType.value
      ? await apiDictionaryTypeUpdate(editingType.value.id, payload)
      : await apiDictionaryTypeCreate(payload);
    if (selectedType.value?.id === result.id) selectedType.value = result;
    void message.success(
      editingType.value ? '字典类型已更新' : '字典类型已创建',
    );
    typeModalOpen.value = false;
    await typeTable.reload();
  } finally {
    typeSubmitting.value = false;
  }
}

async function removeType(record: DictionaryType): Promise<void> {
  await apiDictionaryTypeRemove(record.id);
  if (selectedType.value?.id === record.id) {
    selectedType.value = null;
    itemTable.list.value = [];
  }
  void message.success(`已删除字典 ${record.name}`);
  await typeTable.reload();
}

const itemModalOpen = ref(false);
const editingItem = ref<DictionaryItem | null>(null);
const itemSubmitting = ref(false);
const itemFormRef = ref<FormInstance>();
const itemForm = reactive({
  label: '',
  value: '',
  tone: undefined as DictionaryTone | undefined,
  sort: 0,
  status: 'active' as Status,
  remark: '',
});

const itemRules = {
  label: [{ required: true, message: '请输入显示文本' }],
  value: [{ required: true, message: '请输入业务值' }],
};

function resetItemForm(): void {
  Object.assign(itemForm, {
    label: '',
    value: '',
    tone: undefined,
    sort: 0,
    status: 'active',
    remark: '',
  });
}

function openItemCreate(): void {
  if (!selectedType.value) return;
  editingItem.value = null;
  resetItemForm();
  itemModalOpen.value = true;
}

function openItemEdit(record: DictionaryItem): void {
  editingItem.value = record;
  Object.assign(itemForm, {
    label: record.label,
    value: record.value,
    tone: record.tone ?? undefined,
    sort: record.sort,
    status: record.status,
    remark: record.remark ?? '',
  });
  itemModalOpen.value = true;
}

async function submitItem(): Promise<void> {
  if (!selectedType.value) return;
  await itemFormRef.value?.validate();

  const payload: DictionaryItemPayload = {
    label: itemForm.label,
    value: itemForm.value,
    tone: itemForm.tone ?? null,
    sort: itemForm.sort,
    status: itemForm.status,
    remark: itemForm.remark || undefined,
  };

  itemSubmitting.value = true;
  try {
    if (editingItem.value) {
      await apiDictionaryItemUpdate(editingItem.value.id, payload);
      void message.success('字典项已更新');
    } else {
      await apiDictionaryItemCreate(selectedType.value.id, payload);
      void message.success('字典项已创建');
    }
    itemModalOpen.value = false;
    await itemTable.reload();
  } finally {
    itemSubmitting.value = false;
  }
}

async function removeItem(record: DictionaryItem): Promise<void> {
  await apiDictionaryItemRemove(record.id);
  void message.success(`已删除字典项 ${record.label}`);
  await itemTable.reload();
}

defineOptions({ name: 'DictionaryPage' });
</script>

<template>
  <section
    class="grid flex-1 min-h-0 grid-cols-1 gap-4 overflow-y-auto xl:grid-cols-[minmax(450px,0.9fr)_minmax(560px,1.1fr)] xl:overflow-hidden"
  >
    <div class="flex min-h-130 flex-col gap-4 xl:min-h-0">
      <ProSearch :table="typeTable" :fields="typeFilterFields" />
      <ProTable :table="typeTable" row-key="id" :show-index="false">
        <template #toolbar>
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <a-button
              v-permission="PERMISSIONS.DICT_CREATE"
              type="primary"
              class="shrink-0"
              @click="openTypeCreate"
            >
              新增字典
            </a-button>
            <span class="truncate text-sm a-color-text-tertiary">
              核心系统枚举不在此处维护
            </span>
          </div>
        </template>
      </ProTable>
    </div>

    <div class="flex min-h-130 flex-col gap-4 xl:min-h-0">
      <ProSearch :table="itemTable" :fields="itemFilterFields" />
      <ProTable
        :table="itemTable"
        row-key="id"
        :show-index="false"
        :pagination="false"
      >
        <template #toolbar>
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <a-button
              v-permission="PERMISSIONS.DICT_CREATE"
              type="primary"
              class="shrink-0"
              :disabled="!selectedType"
              @click="openItemCreate"
            >
              新增字典项
            </a-button>
            <span class="min-w-0 truncate text-sm a-color-text-tertiary">
              {{
                selectedType
                  ? `${selectedType.name} · ${selectedType.code}`
                  : '请先在左侧选择字典项'
              }}
            </span>
          </div>
        </template>
      </ProTable>
    </div>

    <a-modal
      v-model:open="typeModalOpen"
      :title="editingType ? `编辑字典：${editingType.name}` : '新增字典'"
      :confirm-loading="typeSubmitting"
      width="760px"
      @ok="submitType"
    >
      <a-form
        ref="typeFormRef"
        class="grid grid-cols-1 gap-x-5 md:grid-cols-2"
        :model="typeForm"
        :rules="typeRules"
        layout="vertical"
      >
        <a-form-item label="字典名称" name="name">
          <a-input v-model:value="typeForm.name" :maxlength="64" />
        </a-form-item>
        <a-form-item label="字典编码" name="code">
          <a-input
            v-model:value="typeForm.code"
            :maxlength="64"
            placeholder="如 business.priority"
          />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group
            v-model:value="typeForm.status"
            :options="STATUS_OPTIONS"
          />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="备注" name="remark">
          <a-textarea
            v-model:value="typeForm.remark"
            :rows="3"
            :maxlength="255"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="itemModalOpen"
      :title="editingItem ? `编辑字典项：${editingItem.label}` : '新增字典项'"
      :confirm-loading="itemSubmitting"
      width="760px"
      @ok="submitItem"
    >
      <a-form
        ref="itemFormRef"
        class="grid grid-cols-1 gap-x-5 md:grid-cols-2"
        :model="itemForm"
        :rules="itemRules"
        layout="vertical"
      >
        <a-form-item label="显示文本" name="label">
          <a-input v-model:value="itemForm.label" :maxlength="64" />
        </a-form-item>
        <a-form-item label="业务值" name="value">
          <a-input v-model:value="itemForm.value" :maxlength="128" />
        </a-form-item>
        <a-form-item label="语义色" name="tone">
          <a-select
            v-model:value="itemForm.tone"
            :options="DICTIONARY_TONE_OPTIONS"
            allow-clear
            placeholder="默认样式"
          />
        </a-form-item>
        <a-form-item label="排序" name="sort">
          <a-input-number
            v-model:value="itemForm.sort"
            :min="0"
            :max="9999"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group
            v-model:value="itemForm.status"
            :options="STATUS_OPTIONS"
          />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="备注" name="remark">
          <a-textarea
            v-model:value="itemForm.remark"
            :rows="3"
            :maxlength="255"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>
