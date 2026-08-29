<script setup lang="ts">
import { message } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { computed, reactive, ref } from 'vue';

import { PERMISSIONS } from '@nest-admin/shared';

import type { MenuNode, PermissionCatalogItem, Role } from '@nest-admin/shared';
import { apiMenuTree } from '@/api/menu';
import {
  apiPermissionCatalog,
  apiRoleCreate,
  apiRoleDetail,
  apiRolePage,
  apiRoleRemove,
  apiRoleSetMenus,
  apiRoleSetPermissions,
  apiRoleUpdate,
  type RoleQuery,
} from '@/api/roles';
import ProSearch, { type FilterField } from '@/components/ProSearch.vue';
import ProTable from '@/components/ProTable.vue';
import { useTable } from '@/composables/use-table';
import {
  DATA_SCOPE_META,
  DATA_SCOPE_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/constants/dicts';
import { formatDateTime } from '@/utils/format';

/** 列定义见 useTable 上方说明：antdv-next 必须用 :columns + #bodyCell，不能用 a-table-column 的 #default */
const columns: TableColumnsType<Role> = [
  { title: '角色码', dataIndex: 'code', key: 'code' },
  { title: '名称', dataIndex: 'name' },
  { title: '数据权限', key: 'dataScope', width: 130 },
  { title: '排序', dataIndex: 'sort', width: 70 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
  { title: '更新时间', key: 'updatedAt', width: 170 },
  { title: '操作', key: 'action', width: 200 },
];

const table = useTable<Role, RoleQuery>({
  fetcher: (query) => apiRolePage(query),
  filters: { keyword: '', status: '' },
});

const filterFields: FilterField[] = [
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
  remark: '',
});

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
    remark: '',
  });
  modalOpen.value = true;
}

function openEdit(record: Role): void {
  editing.value = record;
  Object.assign(form, {
    code: record.code,
    name: record.name,
    sort: record.sort,
    status: record.status,
    dataScope: record.dataScope,
    remark: record.remark ?? '',
  });
  modalOpen.value = true;
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
        remark: form.remark || undefined,
      });
      void message.success('已保存');
    } else {
      await apiRoleCreate({ ...form, remark: form.remark || undefined });
      void message.success('已创建');
    }

    modalOpen.value = false;
    await table.run();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: Role): Promise<void> {
  await apiRoleRemove(record.id);
  void message.success(`已删除角色 ${record.name}`);
  await table.run();
}

// ---- 授权（权限码 + 菜单） ----

const grantModalOpen = ref(false);
const grantTarget = ref<Role | null>(null);
const grantSubmitting = ref(false);

const catalog = ref<PermissionCatalogItem[]>([]);
const menuTree = ref<MenuNode[]>([]);

/** 选中的权限码 id，权限区所有模块的 checkbox-group 共享这一份 */
const permissionIds = ref<number[]>([]);

/**
 * 菜单树的勾选 keys。默认父子联动模式下，「子节点全选的父节点」出现在
 * checkedKeys 里，只勾了部分孩子的父节点出现在 halfCheckedKeys 里。
 */
const menuCheckedKeys = ref<number[]>([]);
const menuHalfCheckedKeys = ref<number[]>([]);

/** 权限目录按 module 分组，渲染成一块块勾选区 */
const catalogGroups = computed(() => {
  const groups = new Map<string, PermissionCatalogItem[]>();

  for (const item of catalog.value) {
    const key = item.module ?? '其他';
    const bucket = groups.get(key);

    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return [...groups.entries()].map(([module, items]) => ({ module, items }));
});

/** 后端菜单树 → a-tree 数据，key 直接用菜单 id */
const menuTreeData = computed(() => toTreeData(menuTree.value));

function toTreeData(nodes: MenuNode[]): {
  key: number;
  title: string;
  children?: { key: number; title: string }[];
}[] {
  return nodes.map((node) => ({
    key: node.id,
    title:
      node.name +
      (node.status === 'disabled' ? '（已停用）' : '') +
      (node.visible ? '' : '（隐藏）'),
    children:
      node.children.length > 0
        ? (toTreeData(node.children) as { key: number; title: string }[])
        : undefined,
  }));
}

function handleMenuCheck(
  keys: number[] | { checked: number[]; halfChecked: number[] },
  info: { halfCheckedKeys?: Array<number | string> },
): void {
  menuCheckedKeys.value = Array.isArray(keys) ? keys : keys.checked;
  menuHalfCheckedKeys.value = (info.halfCheckedKeys ?? []).map(Number);
}

/**
 * 打开授权弹窗并回显，策略见函数体内的注释。
 * 提交时把 checkedKeys 与 halfCheckedKeys 取并集，
 * 原始授权集合不会因为「打开看一眼又关掉」而悄悄变大或缩小。
 */
async function openGrant(record: Role): Promise<void> {
  grantTarget.value = record;
  grantModalOpen.value = true;

  try {
    const [detail, catalogData, tree] = await Promise.all([
      apiRoleDetail(record.id),
      catalog.value.length > 0
        ? Promise.resolve(catalog.value)
        : apiPermissionCatalog(),
      menuTree.value.length > 0 ? Promise.resolve(menuTree.value) : apiMenuTree(),
    ]);

    catalog.value = catalogData;
    menuTree.value = tree;
    permissionIds.value = [...detail.permissionIds];

    const parentIds = collectParentIds(tree);
    // 回显只勾「叶子」：把目录 id 一起塞进 checkedKeys 会触发 antd 的父子
    // 联动，把它全部子节点自动勾上，显示成比实际授权更大的权限。
    // 半选的父目录不能指望 @check 回调补——它只在用户点击时触发，
    // 打开弹窗不动任何勾选就点确定的话它永远是空的，目录授权会被悄悄丢掉。
    // 所以这里按授权集合自己算一遍祖先链。
    menuCheckedKeys.value = detail.menuIds.filter((id) => !parentIds.has(id));
    const granted = new Set(detail.menuIds);
    const ancestors = new Set<number>();
    collectAncestorsOfGranted(tree, granted, [], ancestors);
    menuHalfCheckedKeys.value = [...ancestors];
  } catch (error) {
    grantModalOpen.value = false;
    throw error;
  }
}

/** 收集树里所有「有孩子」的节点 id */
function collectParentIds(nodes: MenuNode[], acc = new Set<number>()): Set<number> {
  for (const node of nodes) {
    if (node.children.length > 0) {
      acc.add(node.id);
      collectParentIds(node.children, acc);
    }
  }

  return acc;
}

/**
 * 收集每个已授权节点的全部祖先 id（不含节点自身）。
 * path 是从根到当前节点的祖先链。
 */
function collectAncestorsOfGranted(
  nodes: MenuNode[],
  granted: Set<number>,
  path: number[],
  acc: Set<number>,
): void {
  for (const node of nodes) {
    if (granted.has(node.id)) {
      path.forEach((id) => acc.add(id));
    }

    collectAncestorsOfGranted(node.children, granted, [...path, node.id], acc);
  }
}

async function submitGrant(): Promise<void> {
  if (!grantTarget.value) {
    return;
  }

  grantSubmitting.value = true;
  try {
    const menuIds = [...new Set([...menuCheckedKeys.value, ...menuHalfCheckedKeys.value])];

    await Promise.all([
      apiRoleSetPermissions(grantTarget.value.id, permissionIds.value),
      apiRoleSetMenus(grantTarget.value.id, menuIds),
    ]);

    void message.success('授权已更新');
    grantModalOpen.value = false;
    await table.run();
  } finally {
    grantSubmitting.value = false;
  }
}

defineOptions({ name: 'RolePage' });
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
  <ProSearch :table="table" :fields="filterFields" />

  <ProTable :table="table" :columns="columns" row-key="id" :filters="filterFields">
    <template #toolbar>
      <a-button
        v-permission="PERMISSIONS.ROLE_CREATE"
        type="primary"
        @click="openCreate"
      >
        新增角色
      </a-button>
    </template>

    <template #bodyCell="{ column, record }: { column: { key: string }; record: Role }">
      <template v-if="column.key === 'code'">
        {{ record.code }}
        <a-tag v-if="record.isSystem" color="gold">内置</a-tag>
      </template>
      <template v-else-if="column.key === 'dataScope'">
        {{ DATA_SCOPE_META[record.dataScope] }}
      </template>
      <template v-else-if="column.key === 'status'">
        <a-tag :color="STATUS_META[record.status].color">
          {{ STATUS_META[record.status].label }}
        </a-tag>
      </template>
      <template v-else-if="column.key === 'updatedAt'">
        {{ formatDateTime(record.updatedAt) }}
      </template>
      <template v-else-if="column.key === 'action'">
        <a-space>
          <a-button
            v-permission="PERMISSIONS.ROLE_UPDATE"
            type="link"
            size="small"
            @click="openEdit(record)"
          >
            编辑
          </a-button>
          <a-button
            v-permission="PERMISSIONS.ROLE_ASSIGN"
            type="link"
            size="small"
            @click="openGrant(record)"
          >
            授权
          </a-button>
          <a-popconfirm
            v-if="!record.isSystem"
            title="确认删除该角色？"
            description="删除后已关联的用户将失去该角色"
            @confirm="remove(record)"
          >
            <a-button v-permission="PERMISSIONS.ROLE_DELETE" type="link" size="small" danger>
              删除
            </a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </template>
  </ProTable>

<!-- 新增 / 编辑 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑角色：${editing.name}` : '新增角色'"
      :confirm-loading="submitting"
      @ok="submit"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
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
          <a-input-number v-model:value="form.sort" :min="0" :max="9999" class="w-full" />
        </a-form-item>
        <a-form-item label="数据权限范围" name="dataScope">
          <a-select v-model:value="form.dataScope" :options="DATA_SCOPE_OPTIONS" />
          <!-- 部门体系尚未落地，如实告知而不是假装这个选项生效 -->
          <p class="mb-0 text-xs text-gray-400">部门体系尚未实现，当前仅存储不生效</p>
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group
            v-model:value="form.status"
            :options="STATUS_OPTIONS"
            :disabled="editing?.isSystem"
          />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-input v-model:value="form.remark" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 授权 -->
    <a-modal
      v-model:open="grantModalOpen"
      :title="`授权：${grantTarget?.name ?? ''}`"
      :confirm-loading="grantSubmitting"
      width="720px"
      @ok="submitGrant"
    >
      <div class="flex gap-4">
        <div class="w-1/2">
          <h4 class="mb-2 font-medium">权限码</h4>
          <a-collapse ghost>
            <a-collapse-panel
              v-for="group in catalogGroups"
              :key="group.module"
              :header="`${group.module}（${group.items.length}）`"
            >
              <a-checkbox-group v-model:value="permissionIds" class="flex flex-col gap-1">
                <a-checkbox v-for="item in group.items" :key="item.id" :value="item.id">
                  {{ item.name }}
                  <span class="text-xs text-gray-400">{{ item.code }}</span>
                </a-checkbox>
              </a-checkbox-group>
            </a-collapse-panel>
          </a-collapse>
        </div>

        <div class="w-1/2">
          <h4 class="mb-2 font-medium">菜单（勾选父节点会带上全部子菜单）</h4>
          <div class="max-h-96 overflow-auto">
            <a-tree
              v-if="menuTreeData.length > 0"
              v-model:checked-keys="menuCheckedKeys"
              checkable
              block-node
              :tree-data="menuTreeData"
              :default-expand-all="true"
              @check="handleMenuCheck"
            />
            <a-empty v-else description="暂无菜单" />
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>
