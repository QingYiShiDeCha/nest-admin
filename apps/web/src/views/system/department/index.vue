<script setup lang="ts">
import { App, Button, Popconfirm, Space, Tooltip } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { computed, h, reactive, ref, watch } from 'vue';

import {
  PERMISSIONS,
  type DepartmentNode,
  type Status,
} from '@nest-admin/shared';

import {
  apiDepartmentCreate,
  apiDepartmentRemove,
  apiDepartmentTree,
  apiDepartmentUpdate,
  type DepartmentPayload,
  type DepartmentQuery,
} from '@/api/departments';
import AppTag from '@/components/core/base/app-tag/index.vue';
import UserSelect from '@/components/core/selectors/user-select/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import { STATUS_META, STATUS_OPTIONS } from '@/constants/dicts';
import TransferHistoryDrawer from './components/transfer-history-drawer/index.vue';

const { message } = App.useApp();
const { can } = usePermission();

const columns: TableColumnsType<DepartmentNode> = [
  { title: '部门名称', dataIndex: 'name', key: 'name', width: 220 },
  { title: '部门编码', dataIndex: 'code', key: 'code', width: 150 },
  {
    title: '负责人',
    dataIndex: 'leaderName',
    key: 'leaderName',
    width: 120,
  },
  { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 140 },
  {
    title: '直属用户',
    dataIndex: 'userCount',
    key: 'userCount',
    width: 90,
    align: 'center',
  },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 70 },
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
    title: '操作',
    key: 'action',
    width: 300,
    render: (_value, record) =>
      h(Space, null, {
        default: () => [
          can(PERMISSIONS.DEPT_UPDATE)
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
          can(PERMISSIONS.DEPT_CREATE) && record.status === 'active'
            ? h(
                Button,
                {
                  type: 'link',
                  size: 'small',
                  onClick: () => openCreate(record),
                },
                () => '新增下级',
              )
            : null,
          can(PERMISSIONS.DEPT_TRANSFER_LIST)
            ? h(
                Button,
                {
                  type: 'link',
                  size: 'small',
                  onClick: () => openTransferHistory(record),
                },
                () => '迁移记录',
              )
            : null,
          can(PERMISSIONS.DEPT_DELETE) && canRemove(record)
            ? h(
                Popconfirm,
                {
                  title: '确认删除该部门？',
                  description: '删除后部门编码不可复用',
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
          can(PERMISSIONS.DEPT_DELETE) && !canRemove(record)
            ? h(
                Tooltip,
                { title: removeDisabledReason(record) },
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

const table = useTable<DepartmentNode, DepartmentQuery>({
  columns,
  pagination: false,
  filters: { keyword: '', status: '' },
  fetcher: apiDepartmentTree,
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<DepartmentQuery>[] = [
  {
    label: '关键词',
    key: 'keyword',
    placeholder: '部门名称或编码',
  },
  { label: '状态', key: 'status', type: 'select', options: STATUS_OPTIONS },
];

const expandedKeys = ref<number[]>([]);
watch(table.list, (nodes) => {
  expandedKeys.value = collectExpandableKeys(nodes);
});

function collectExpandableKeys(
  nodes: DepartmentNode[],
  result: number[] = [],
): number[] {
  for (const node of nodes) {
    if (node.children.length > 0) {
      result.push(node.id);
      collectExpandableKeys(node.children, result);
    }
  }
  return result;
}

function canExpandRow(record: DepartmentNode): boolean {
  return record.children.length > 0;
}

function canRemove(record: DepartmentNode): boolean {
  return record.children.length === 0 && record.userCount === 0;
}

function removeDisabledReason(record: DepartmentNode): string {
  if (record.children.length > 0) return '存在子部门，请先移动或删除子部门';
  return '存在直属用户，请先调整用户所属部门';
}

const modalOpen = ref(false);
const editing = ref<DepartmentNode | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  parentId: undefined as number | undefined,
  name: '',
  code: '',
  leaderId: undefined as number | undefined,
  phone: '',
  email: '',
  sort: 0,
  status: 'active' as Status,
  moveReason: '',
});

const parentChanged = computed(
  () =>
    editing.value !== null &&
    (form.parentId ?? null) !== editing.value.parentId,
);

const rules = {
  name: [{ required: true, message: '请输入部门名称' }],
  code: [
    { required: true, message: '请输入部门编码' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      message: '以字母开头，只能包含字母、数字、下划线和中划线',
    },
  ],
  phone: [
    {
      pattern: /^[0-9+() -]*$/,
      message: '联系电话格式不正确',
    },
  ],
  email: [{ type: 'email' as const, message: '邮箱格式不正确' }],
};

const excludedParentIds = computed(() => {
  const ids = new Set<number>();
  if (editing.value) collectSubtreeIds(editing.value, ids);
  return ids;
});

const parentTreeData = computed(() =>
  toParentTreeData(table.list.value, excludedParentIds.value),
);

function collectSubtreeIds(node: DepartmentNode, ids: Set<number>): void {
  ids.add(node.id);
  node.children.forEach((child) => collectSubtreeIds(child, ids));
}

function toParentTreeData(
  nodes: DepartmentNode[],
  excludedIds: Set<number>,
): {
  value: number;
  label: string;
  disabled: boolean;
  children?: unknown[];
}[] {
  return nodes.map((node) => ({
    value: node.id,
    label: node.name + (node.status === 'disabled' ? '（已停用）' : ''),
    disabled: node.status === 'disabled' || excludedIds.has(node.id),
    children:
      node.children.length > 0
        ? toParentTreeData(node.children, excludedIds)
        : undefined,
  }));
}

function resetForm(parent?: DepartmentNode): void {
  Object.assign(form, {
    parentId: parent?.id,
    name: '',
    code: '',
    leaderId: undefined,
    phone: '',
    email: '',
    sort: 0,
    status: 'active',
    moveReason: '',
  });
}

function openCreate(parent?: DepartmentNode): void {
  editing.value = null;
  resetForm(parent);
  modalOpen.value = true;
}

function openEdit(record: DepartmentNode): void {
  editing.value = record;
  Object.assign(form, {
    parentId: record.parentId ?? undefined,
    name: record.name,
    code: record.code,
    leaderId: record.leaderId ?? undefined,
    phone: record.phone ?? '',
    email: record.email ?? '',
    sort: record.sort,
    status: record.status,
    moveReason: '',
  });
  modalOpen.value = true;
}

async function submit(): Promise<void> {
  await formRef.value?.validate();

  const payload: DepartmentPayload = {
    parentId: form.parentId ?? null,
    name: form.name,
    code: form.code,
    leaderId: form.leaderId ?? null,
    phone: form.phone || undefined,
    email: form.email || undefined,
    sort: form.sort,
    status: form.status,
    moveReason: parentChanged.value ? form.moveReason.trim() : undefined,
  };

  submitting.value = true;
  try {
    if (editing.value) {
      await apiDepartmentUpdate(editing.value.id, payload);
      void message.success('部门已更新');
    } else {
      await apiDepartmentCreate(payload);
      void message.success('部门已创建');
    }
    modalOpen.value = false;
    await table.reload();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: DepartmentNode): Promise<void> {
  await apiDepartmentRemove(record.id);
  void message.success(`已删除部门 ${record.name}`);
  await table.reload();
}

const historyOpen = ref(false);
const historyDepartment = ref<DepartmentNode | null>(null);

function openTransferHistory(record: DepartmentNode): void {
  historyDepartment.value = record;
  historyOpen.value = true;
}

defineOptions({ name: 'DepartmentPage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable
      v-model:expanded-row-keys="expandedKeys"
      :table="table"
      row-key="id"
      :pagination="false"
      :show-index="false"
      :row-expandable="canExpandRow"
    >
      <template #toolbar>
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <a-button
            v-permission="PERMISSIONS.DEPT_CREATE"
            type="primary"
            class="shrink-0"
            @click="openCreate()"
          >
            新增部门
          </a-button>
          <span class="min-w-0 truncate text-sm a-color-text-tertiary">
            部门停用后不可新增下级或分配给用户
          </span>
        </div>
      </template>
    </ProTable>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑部门：${editing.name}` : '新增部门'"
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
        <a-form-item label="上级部门" name="parentId">
          <a-tree-select
            v-model:value="form.parentId"
            class="w-full"
            :tree-data="parentTreeData"
            tree-default-expand-all
            allow-clear
            placeholder="不选则为顶级部门"
          />
        </a-form-item>
        <a-form-item label="部门名称" name="name">
          <a-input v-model:value="form.name" :maxlength="64" />
        </a-form-item>
        <a-form-item label="部门编码" name="code">
          <a-input
            v-model:value="form.code"
            :maxlength="64"
            placeholder="如 rd_center"
          />
        </a-form-item>
        <a-form-item label="负责人" name="leaderId">
          <UserSelect
            v-model="form.leaderId"
            :initial-label="editing?.leaderName"
          />
        </a-form-item>
        <a-form-item label="联系电话" name="phone">
          <a-input v-model:value="form.phone" :maxlength="20" />
        </a-form-item>
        <a-form-item label="联系邮箱" name="email">
          <a-input v-model:value="form.email" :maxlength="128" />
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
        <a-form-item
          v-if="parentChanged"
          class="md:col-span-2"
          label="迁移原因"
          name="moveReason"
          :rules="[
            { required: true, whitespace: true, message: '请输入迁移原因' },
          ]"
        >
          <a-textarea
            v-model:value="form.moveReason"
            :rows="3"
            :maxlength="255"
            show-count
            placeholder="请说明本次组织调整原因"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <TransferHistoryDrawer
      v-model:open="historyOpen"
      :department="historyDepartment"
    />
  </section>
</template>
