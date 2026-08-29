<script setup lang="ts">
import { message } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { computed, onMounted, reactive, ref } from 'vue';

import { PERMISSIONS, type MenuNode } from '@nest-admin/shared';

import {
  apiMenuCreate,
  apiMenuRemove,
  apiMenuTree,
  apiMenuUpdate,
  type MenuPayload,
} from '@/api/menu';
import { MENU_ICONS } from '@/layouts/menu-icons';
import {
  MENU_TYPE_META,
  MENU_TYPE_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/constants/dicts';

/** 列定义用 :columns + #bodyCell：a-table-column 的 #default 在 antdv-next 是嵌套列语法，无参调用会崩 */
const columns: TableColumnsType<MenuNode> = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 220 },
  { title: '类型', key: 'type', width: 90 },
  { title: '路由路径', dataIndex: 'path', key: 'path' },
  { title: '排序', dataIndex: 'sort', width: 70 },
  { title: '侧边栏', key: 'visible', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 220 },
];

const tree = ref<MenuNode[]>([]);
const loading = ref(false);

/** 受控展开：数据回来后展开全部目录节点，新弹窗里选父节点也一目了然 */
const expandedKeys = ref<number[]>([]);

async function load(): Promise<void> {
  loading.value = true;
  try {
    tree.value = await apiMenuTree();
    expandedKeys.value = collectDirectoryKeys(tree.value);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function collectDirectoryKeys(nodes: MenuNode[], acc: number[] = []): number[] {
  for (const node of nodes) {
    if (node.children.length > 0) {
      acc.push(node.id);
      collectDirectoryKeys(node.children, acc);
    }
  }

  return acc;
}

// ---- 新增 / 编辑 ----

const modalOpen = ref(false);
/** 编辑对象直接用树节点：树表格里没有 createdAt，编辑表单也用不到它 */
const editing = ref<MenuNode | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  parentId: undefined as number | undefined,
  name: '',
  type: 'menu' as MenuNode['type'],
  path: '',
  component: '',
  icon: '',
  sort: 0,
  visible: true,
  keepAlive: false,
  status: 'active' as 'active' | 'disabled',
});

/**
 * 目录不对应页面，path/component 不该填；menu 必须有 path；
 * external 的 path 是完整 URL。前端先行校验，后端还有一道。
 */
const rules = computed(() => ({
  name: [{ required: true, message: '请输入名称' }],
  path:
    form.type === 'directory'
      ? []
      : [
          { required: true, message: '请输入路由路径' },
          ...(form.type === 'external'
            ? [
                {
                  pattern: /^https?:\/\//,
                  message: '外链需填完整 URL（http:// 或 https:// 开头）',
                },
              ]
            : [{ pattern: /^\//, message: '站内路由需以 / 开头' }]),
        ],
}));

/** 父节点选择：只有目录可以当父节点，其他类型禁选 */
const parentTreeData = computed(() =>
  toParentTreeData(tree.value, editing.value?.id),
);

function toParentTreeData(
  nodes: MenuNode[],
  excludeId: number | undefined,
): { value: number; label: string; disabled?: boolean; children?: unknown[] }[] {
  return nodes.map((node) => ({
    value: node.id,
    label:
      node.name +
      (node.type !== 'directory' ? '（非目录）' : '') +
      (node.status === 'disabled' ? '（已停用）' : ''),
    disabled: node.type !== 'directory' || node.id === excludeId,
    children:
      node.children.length > 0
        ? toParentTreeData(node.children, excludeId)
        : undefined,
  }));
}

function openCreate(parent?: MenuNode): void {
  editing.value = null;
  Object.assign(form, {
    parentId: parent?.id,
    name: '',
    type: 'menu',
    path: '',
    component: '',
    icon: '',
    sort: 0,
    visible: true,
    keepAlive: false,
    status: 'active',
  });
  modalOpen.value = true;
}

function openEdit(record: MenuNode): void {
  editing.value = record;
  Object.assign(form, {
    parentId: record.parentId ?? undefined,
    name: record.name,
    type: record.type,
    path: record.path ?? '',
    component: record.component ?? '',
    icon: record.icon ?? '',
    sort: record.sort,
    visible: record.visible,
    keepAlive: record.keepAlive,
    status: record.status,
  });
  modalOpen.value = true;
}

async function submit(): Promise<void> {
  await formRef.value?.validate();

  submitting.value = true;
  try {
    const payload: MenuPayload = {
      parentId: form.parentId,
      name: form.name,
      type: form.type,
      sort: form.sort,
      visible: form.visible,
      keepAlive: form.keepAlive,
      status: form.status,
      // 目录的 path/component 恒为空，不留脏数据
      path: form.type === 'directory' ? undefined : form.path || undefined,
      component: form.type === 'menu' ? form.component || undefined : undefined,
      icon: form.icon || undefined,
    };

    if (editing.value) {
      await apiMenuUpdate(editing.value.id, payload);
      void message.success('已保存，刷新页面后生效');
    } else {
      await apiMenuCreate(payload);
      void message.success('已创建，刷新页面后生效');
    }

    modalOpen.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
}

async function remove(record: MenuNode): Promise<void> {
  await apiMenuRemove(record.id);
  void message.success(`已删除菜单 ${record.name}`);
  await load();
}

const iconKeys = Object.keys(MENU_ICONS);

defineOptions({ name: 'MenuPage' });
</script>

<template>
  <a-card>
    <div class="mb-4 flex items-center gap-2">
      <span class="text-sm text-gray-400">
        侧边栏由这里的菜单驱动；path 需与前端静态路由一致才会出现在侧边栏
      </span>
      <a-button
        v-permission="PERMISSIONS.MENU_CREATE"
        class="ml-auto"
        type="primary"
        @click="openCreate()"
      >
        新增菜单
      </a-button>
    </div>

    <a-table
      row-key="id"
      :columns="columns"
      :data-source="tree"
      :loading="loading"
      :pagination="false"
      v-model:expanded-row-keys="expandedKeys"
    >
      <template #bodyCell="{ column, record }: { column: { key: string }; record: MenuNode }">
        <template v-if="column.key === 'type'">
          <a-tag :color="MENU_TYPE_META[record.type].color">
            {{ MENU_TYPE_META[record.type].label }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'visible'">
          <a-tag v-if="!record.visible" color="orange">隐藏</a-tag>
          <span v-else>显示</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="STATUS_META[record.status].color">
            {{ STATUS_META[record.status].label }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              v-permission="PERMISSIONS.MENU_UPDATE"
              type="link"
              size="small"
              @click="openEdit(record)"
            >
              编辑
            </a-button>
            <a-button
              v-if="record.type === 'directory'"
              v-permission="PERMISSIONS.MENU_CREATE"
              type="link"
              size="small"
              @click="openCreate(record)"
            >
              新增子项
            </a-button>
            <a-popconfirm
              v-if="record.children.length === 0"
              title="确认删除该菜单？"
              @confirm="remove(record)"
            >
              <a-button v-permission="PERMISSIONS.MENU_DELETE" type="link" size="small" danger>
                删除
              </a-button>
            </a-popconfirm>
            <a-tooltip v-else title="存在子菜单，先删除子菜单">
              <a-button v-permission="PERMISSIONS.MENU_DELETE" type="link" size="small" danger disabled>
                删除
              </a-button>
            </a-tooltip>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新增 / 编辑 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑菜单：${editing.name}` : '新增菜单'"
      :confirm-loading="submitting"
      @ok="submit"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="父节点" name="parentId">
          <a-tree-select
            v-model:value="form.parentId"
            class="w-full"
            allow-clear
            tree-default-expand-all
            placeholder="不选则为顶层节点"
            :tree-data="parentTreeData"
            :field-names="{ label: 'label', value: 'value', children: 'children' }"
          />
        </a-form-item>
        <a-form-item label="类型" name="type">
          <a-radio-group
            v-model:value="form.type"
            :options="MENU_TYPE_OPTIONS"
            option-type="button"
            :disabled="!!editing"
          />
        </a-form-item>
        <a-form-item label="名称" name="name">
          <a-input v-model:value="form.name" />
        </a-form-item>
        <a-form-item v-if="form.type !== 'directory'" label="路由路径" name="path">
          <a-input
            v-model:value="form.path"
            :placeholder="form.type === 'external' ? 'https://example.com' : '/system/user'"
          />
        </a-form-item>
        <a-form-item v-if="form.type === 'menu'" label="前端组件路径" name="component">
          <a-input v-model:value="form.component" placeholder="仅存档参考，页面注册在前端路由表里" />
        </a-form-item>
        <a-form-item label="图标" name="icon">
          <a-select
            v-model:value="form.icon"
            class="w-full"
            allow-clear
            show-search
            placeholder="选择或留空"
            :options="iconKeys.map((k) => ({ label: k, value: k }))"
          />
        </a-form-item>
        <a-form-item label="排序" name="sort">
          <a-input-number v-model:value="form.sort" :min="0" :max="9999" class="w-full" />
        </a-form-item>
        <a-form-item label="显示选项">
          <a-checkbox v-model:checked="form.visible">在侧边栏显示</a-checkbox>
          <a-checkbox v-model:checked="form.keepAlive">缓存页面</a-checkbox>
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="form.status" :options="STATUS_OPTIONS" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>
