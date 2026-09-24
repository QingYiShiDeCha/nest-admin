<script setup lang="tsx">
import { App, Button, Popconfirm, Space } from 'antdv-next';
import type { FormInstance } from 'antdv-next';
import { computed, reactive, ref } from 'vue';

import { PERMISSIONS } from '@nest-admin/shared';

import type { DepartmentNode, Role } from '@nest-admin/shared';
import { apiDepartmentTree } from '@/api/departments';
import {
  apiRoleCreate,
  apiRoleDetail,
  apiRolePage,
  apiRoleRemove,
  apiRoleUpdate,
  type RoleQuery,
} from '@/api/roles';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import {
  DATA_SCOPE_META,
  DATA_SCOPE_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/constants/dicts';
import RoleGrantModal from './components/role-grant-modal/index.vue';
import { formatDateTime } from '@/utils/format';

const { message } = App.useApp();

const { can } = usePermission();

const table = useTable<Role, RoleQuery>({
  columns: [
    {
      title: '角色码',
      dataIndex: 'code',
      key: 'code',
      render: (_value, record) => (
        <Space size={4}>
          {record.code}
          {record.isSystem ? <AppTag tone="warning">内置</AppTag> : null}
        </Space>
      ),
    },
    { title: '名称', dataIndex: 'name' },
    {
      title: '数据权限',
      key: 'dataScope',
      width: 130,
      render: (_value, record) => DATA_SCOPE_META[record.dataScope],
    },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render: (_value, record) => (
        <AppTag tone={STATUS_META[record.status].color}>
          {STATUS_META[record.status].label}
        </AppTag>
      ),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '更新时间',
      key: 'updatedAt',
      width: 170,
      render: (_value, record) => formatDateTime(record.updatedAt),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_value, record) => (
        <Space>
          {can(PERMISSIONS.ROLE_UPDATE) ? (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          ) : null}
          {can(PERMISSIONS.ROLE_ASSIGN) ? (
            <Button type="link" size="small" onClick={() => openGrant(record)}>
              授权
            </Button>
          ) : null}
          {can(PERMISSIONS.ROLE_DELETE) && !record.isSystem ? (
            <Popconfirm
              title="确认删除该角色？"
              description="删除后已关联的用户将失去该角色"
              onConfirm={() => remove(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ],
  fetcher: (query) => apiRolePage(query),
  filters: { keyword: '', status: '' },
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<RoleQuery>[] = [
  { label: '关键词', key: 'keyword', placeholder: '角色码或名称搜索' },
  { label: '状态', key: 'status', type: 'select', options: STATUS_OPTIONS },
];

// ---- 新增 / 编辑 ----

const modalOpen = ref(false);
const editing = ref<Role | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  code: '',
  name: '',
  sort: 0,
  status: 'active' as 'active' | 'disabled',
  dataScope: 'self' as Role['dataScope'],
  departmentIds: [] as number[],
  remark: '',
});

const departmentTree = ref<DepartmentNode[]>([]);
const departmentTreeData = computed(() =>
  toDepartmentTreeData(departmentTree.value),
);

function toDepartmentTreeData(nodes: DepartmentNode[]): {
  value: number;
  label: string;
  disabled: boolean;
  children?: unknown[];
}[] {
  return nodes.map((node) => ({
    value: node.id,
    label: node.name + (node.status === 'disabled' ? '（已停用）' : ''),
    disabled: node.status === 'disabled',
    children:
      node.children.length > 0
        ? toDepartmentTreeData(node.children)
        : undefined,
  }));
}

async function ensureDepartmentTree(): Promise<void> {
  if (departmentTree.value.length === 0) {
    departmentTree.value = await apiDepartmentTree();
  }
}

const rules = {
  code: [
    { required: true, message: '请输入角色码' },
    {
      pattern: /^[a-z][a-z0-9_]*$/,
      message: '小写字母开头，只能包含小写字母、数字和下划线',
    },
  ],
  name: [{ required: true, message: '请输入角色名称' }],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    code: '',
    name: '',
    sort: 0,
    status: 'active',
    dataScope: 'self',
    departmentIds: [],
    remark: '',
  });
  modalOpen.value = true;
  void ensureDepartmentTree();
}

async function openEdit(record: Role): Promise<void> {
  editing.value = record;
  // 先重置表单再拉详情，但弹窗必须在详情加载成功后才打开：
  // 失败时若停留在「自定义部门已清空」的半成品状态，用户点保存会
  // 把已配置的部门静默提交成空数组
  Object.assign(form, {
    code: record.code,
    name: record.name,
    sort: record.sort,
    status: record.status,
    dataScope: record.dataScope,
    departmentIds: [],
    remark: record.remark ?? '',
  });

  try {
    const [detail] = await Promise.all([
      apiRoleDetail(record.id),
      ensureDepartmentTree(),
    ]);
    form.departmentIds = [...detail.departmentIds];
    modalOpen.value = true;
  } catch (error) {
    void message.error(
      error instanceof Error ? error.message : '加载角色详情失败',
    );
  }
}

async function submit(): Promise<void> {
  await formRef.value?.validate();

  submitting.value = true;
  try {
    if (editing.value) {
      // 内置角色的角色码与状态后端拒绝修改，禁用控件之外这里也不提交它们
      await apiRoleUpdate(editing.value.id, {
        name: form.name,
        sort: form.sort,
        status: editing.value.isSystem ? undefined : form.status,
        dataScope: form.dataScope,
        departmentIds: form.dataScope === 'custom' ? form.departmentIds : [],
        remark: form.remark || undefined,
      });
      void message.success('已保存');
    } else {
      await apiRoleCreate({
        ...form,
        departmentIds: form.dataScope === 'custom' ? form.departmentIds : [],
        remark: form.remark || undefined,
      });
      void message.success('已创建');
    }

    modalOpen.value = false;
    await table.reload();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: Role): Promise<void> {
  await apiRoleRemove(record.id);
  void message.success(`已删除角色 ${record.name}`);
  await table.reload();
}

// ---- 授权（权限码 + 菜单） ----

const grantModalOpen = ref(false);
const grantTarget = ref<Role | null>(null);

/**
 * 打开授权弹窗。数据加载、错误提示与保存都在弹窗组件内部完成：
 * 授权的权限门禁只需要 system:role:assign，与弹窗内那个聚合接口一一对应，
 * 列表页不必再关心它要拉哪些数据、要哪些附加权限。
 */
function openGrant(record: Role): void {
  grantTarget.value = record;
  grantModalOpen.value = true;
}

async function onGrantSaved(): Promise<void> {
  await table.reload();
}

defineOptions({ name: 'RolePage' });
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <a-button
          v-permission="PERMISSIONS.ROLE_CREATE"
          type="primary"
          @click="openCreate"
        >
          新增角色
        </a-button>
      </template>
    </ProTable>

    <!-- 新增 / 编辑 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑角色：${editing.name}` : '新增角色'"
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
        <a-form-item label="角色码" name="code">
          <a-input
            v-model:value="form.code"
            :disabled="!!editing && editing.isSystem"
            placeholder="如 content_editor"
          />
        </a-form-item>
        <a-form-item label="名称" name="name">
          <a-input v-model:value="form.name" />
        </a-form-item>
        <a-form-item label="排序" name="sort">
          <a-input-number
            v-model:value="form.sort"
            :min="0"
            :max="9999"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="数据权限范围" name="dataScope">
          <a-select
            v-model:value="form.dataScope"
            :options="DATA_SCOPE_OPTIONS"
          />
        </a-form-item>
        <a-form-item
          v-if="form.dataScope === 'custom'"
          class="md:col-span-2"
          label="自定义部门"
          name="departmentIds"
        >
          <a-tree-select
            v-model:value="form.departmentIds"
            class="w-full"
            :tree-data="departmentTreeData"
            tree-checkable
            tree-default-expand-all
            allow-clear
            placeholder="请选择可查看的部门"
          />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group
            v-model:value="form.status"
            :options="STATUS_OPTIONS"
            :disabled="editing?.isSystem"
          />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="备注" name="remark">
          <a-input v-model:value="form.remark" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 授权 -->
    <RoleGrantModal
      v-model:open="grantModalOpen"
      :role="grantTarget"
      @saved="onGrantSaved"
    />
  </div>
</template>
