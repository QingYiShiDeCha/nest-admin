<script setup lang="ts">
import type { MenuNode, PermissionCatalogItem, Role } from '@nest-admin/shared';
import { App } from 'antdv-next';
import { computed, ref, watch } from 'vue';

import { apiRoleGrants, apiRoleSetGrants } from '@/api/roles';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import {
  applySelection,
  collectCheckableIds,
  collectParentIds,
  countSelected,
  filterMenuTree,
  groupPermissions,
  matchPermission,
  mergeMenuSelection,
  resolveMenuSelection,
  sameIdSet,
  toMenuTreeData,
} from './utils';

/**
 * 角色授权弹窗：左侧权限码、右侧菜单。
 *
 * 数据由 GET /roles/:id/grants 一次取回（回显 + 候选项），保存走
 * PUT /roles/:id/grants 单事务提交，所以这个组件只需要一个权限码
 * system:role:assign——与列表页「授权」按钮的显示条件完全对应。
 */
const props = defineProps<{
  open: boolean;
  role: Role | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  saved: [];
}>();

const { message } = App.useApp();

/**
 * 候选项每次打开都重新拉，不做跨次缓存：权限码目录会随版本新增，
 * 长期缓存会让新权限码永远看不见，而这几十到几百条数据再拉一次可以忽略。
 */
const catalog = ref<PermissionCatalogItem[]>([]);
const menuTree = ref<MenuNode[]>([]);
const loading = ref(false);
const submitting = ref(false);

/** 权限码勾选 */
const permissionIds = ref<number[]>([]);

/**
 * 菜单的授权集合是唯一事实来源；menuCheckedKeys / menuHalfCheckedKeys
 * 只是给 a-tree 看的投影——父子联动下 a-tree 把「勾选」和「半选」拆成两个
 * 集合回报，直接拿它俩当状态，会在全选/清空/重置这类程序化改动后失同步。
 */
const menuGrantedIds = ref<number[]>([]);
const menuCheckedKeys = ref<number[]>([]);
const menuHalfCheckedKeys = ref<number[]>([]);

/** 打开时的基线：用于判断「有未保存改动」以及「重置」的目标 */
const baselinePermissionIds = ref<number[]>([]);
const baselineMenuIds = ref<number[]>([]);

const permissionKeyword = ref('');
const menuKeyword = ref('');
const activeGroups = ref<(string | number)[]>([]);
const expandedMenuKeys = ref<number[]>([]);

const groups = computed(() => groupPermissions(catalog.value));

/**
 * 过滤后的分组视图。计数按「可见项」算，否则搜索时会显示成
 * 「搜出 3 项、已选却是 7/71」，看起来像界面算错了。
 */
const visibleGroups = computed(() =>
  groups.value
    .map((group) => {
      const items = group.items.filter((item) =>
        matchPermission(item, permissionKeyword.value),
      );
      const selectedCount = countSelected(items, permissionIds.value);

      return {
        key: group.key,
        label: group.label,
        items,
        selectedCount,
        allChecked: items.length > 0 && selectedCount === items.length,
        someChecked: selectedCount > 0 && selectedCount < items.length,
      };
    })
    .filter((group) => group.items.length > 0),
);

/** 全选/清空的作用域是「当前可见项」，搜索时不会牵连看不见的权限码 */
const visiblePermissionIds = computed(() =>
  visibleGroups.value.flatMap((group) => group.items.map((item) => item.id)),
);

const filteredMenu = computed(() =>
  filterMenuTree(menuTree.value, menuKeyword.value),
);
const menuTreeData = computed(() => toMenuTreeData(filteredMenu.value.tree));

const selectedPermissionCount = computed(() => permissionIds.value.length);
const selectedMenuCount = computed(() => menuGrantedIds.value.length);
const checkableMenuIds = computed(() => collectCheckableIds(menuTree.value));

const isDirty = computed(
  () =>
    !sameIdSet(permissionIds.value, baselinePermissionIds.value) ||
    !sameIdSet(menuGrantedIds.value, baselineMenuIds.value),
);

watch(
  () => props.open,
  (open) => {
    if (open) {
      void load();
    }
  },
);

// 搜索后自动展开命中项，否则用户得手动一个个点开才看得到结果
watch(permissionKeyword, () => {
  activeGroups.value = visibleGroups.value.map((group) => group.key);
});

watch(menuKeyword, () => {
  expandedMenuKeys.value = filteredMenu.value.expandKeys;
});

/** 用授权集合重算 a-tree 的勾选投影 */
function syncMenuView(grantedIds: readonly number[]): void {
  menuGrantedIds.value = [...grantedIds];

  const view = resolveMenuSelection(menuTree.value, grantedIds);
  menuCheckedKeys.value = view.checked;
  menuHalfCheckedKeys.value = view.halfChecked;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试';
}

async function load(): Promise<void> {
  const role = props.role;

  if (!role) {
    return;
  }

  loading.value = true;

  try {
    const grants = await apiRoleGrants(role.id);

    catalog.value = grants.catalog;
    menuTree.value = grants.menuTree;

    permissionIds.value = [...grants.permissionIds];
    baselinePermissionIds.value = [...grants.permissionIds];
    baselineMenuIds.value = [...grants.menuIds];
    syncMenuView(grants.menuIds);

    permissionKeyword.value = '';
    menuKeyword.value = '';
    // 分组只有十几个，默认收起等于让人先点开才知道里面有什么
    activeGroups.value = groups.value.map((group) => group.key);
    expandedMenuKeys.value = [...collectParentIds(menuTree.value)];
  } catch (error) {
    // 打不开就关掉弹窗，别留一个空壳让人以为还能操作
    void message.error(errorMessage(error));
    emit('update:open', false);
  } finally {
    loading.value = false;
  }
}

function toggleGroup(
  group: { items: PermissionCatalogItem[] },
  checked: boolean,
): void {
  permissionIds.value = applySelection(
    permissionIds.value,
    group.items.map((item) => item.id),
    checked,
  );
}

function toggleAllPermissions(checked: boolean): void {
  permissionIds.value = applySelection(
    permissionIds.value,
    visiblePermissionIds.value,
    checked,
  );
}

/**
 * a-tree 的 @check：antd 回报的是「当前全部勾选 / 全部半选」集合（不是增量），
 * 所以可以整体替换。两者取并集才是这一侧最终的授权集合。
 */
function handleMenuCheck(
  keys: number[] | { checked: number[]; halfChecked: number[] },
  info: { halfCheckedKeys?: Array<number | string> },
): void {
  menuCheckedKeys.value = Array.isArray(keys) ? keys : keys.checked;
  menuHalfCheckedKeys.value = (info.halfCheckedKeys ?? []).map(Number);
  menuGrantedIds.value = mergeMenuSelection(
    menuCheckedKeys.value,
    menuHalfCheckedKeys.value,
  );
}

/** 菜单全选：只选可勾选节点，停用菜单不参与 */
function toggleAllMenus(checked: boolean): void {
  syncMenuView(checked ? checkableMenuIds.value : []);
}

function toggleExpandAll(checked: boolean): void {
  expandedMenuKeys.value = checked ? [...collectParentIds(menuTree.value)] : [];
}

/** 回到打开时的状态 */
function resetSelection(): void {
  permissionIds.value = [...baselinePermissionIds.value];
  syncMenuView(baselineMenuIds.value);
}

async function submit(): Promise<void> {
  const role = props.role;

  if (!role) {
    return;
  }

  submitting.value = true;

  try {
    await apiRoleSetGrants(role.id, {
      permissionIds: [...permissionIds.value],
      menuIds: [...menuGrantedIds.value],
    });

    void message.success('授权已更新');
    emit('saved');
    emit('update:open', false);
  } catch (error) {
    // 失败时保留弹窗与已勾选状态，用户可以直接重试，不必从头点一遍
    void message.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

function close(): void {
  emit('update:open', false);
}

defineOptions({ name: 'RoleGrantModal' });
</script>

<template>
  <a-modal
    :open="open"
    :title="`授权：${role?.name ?? ''}`"
    :mask-closable="false"
    :keyboard="false"
    width="1000px"
    @cancel="close"
  >
    <div class="flex flex-col gap-3">
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs a-color-text-secondary"
      >
        <span>权限码 {{ selectedPermissionCount }} / {{ catalog.length }}</span>
        <span>菜单 {{ selectedMenuCount }} / {{ checkableMenuIds.length }}</span>
        <span v-if="isDirty" class="a-color-warning">有未保存的改动</span>
      </div>

      <div class="flex flex-col gap-4 md:h-[60vh] md:flex-row">
        <section class="flex h-[60vh] w-full min-h-0 flex-col md:h-auto md:w-1/2">
          <header class="mb-2 flex items-center justify-between gap-2">
            <h4 class="font-medium">权限码</h4>
            <div class="flex items-center">
              <a-button
                type="link"
                size="small"
                :disabled="loading"
                @click="toggleAllPermissions(true)"
              >
                全选
              </a-button>
              <a-button
                type="link"
                size="small"
                :disabled="loading"
                @click="toggleAllPermissions(false)"
              >
                清空
              </a-button>
            </div>
          </header>

          <a-input
            v-model:value="permissionKeyword"
            allow-clear
            placeholder="搜索权限名称或编码"
          >
            <template #prefix>
              <AppIcon icon="i-ri:search-2-line" class="a-color-text-tertiary" />
            </template>
          </a-input>

          <div class="mt-2 min-h-0 flex-1 overflow-auto pr-1">
            <a-skeleton v-if="loading" active :paragraph="{ rows: 6 }" />
            <a-empty
              v-else-if="visibleGroups.length === 0"
              :description="catalog.length === 0 ? '暂无权限码' : '没有匹配的权限码'"
            />
            <a-collapse v-else v-model:active-key="activeGroups" ghost>
              <a-collapse-panel v-for="group in visibleGroups" :key="group.key">
                <template #header>
                  <div class="flex flex-1 items-center gap-2">
                    <a-checkbox
                      :checked="group.allChecked"
                      :indeterminate="group.someChecked"
                      @click.stop
                      @change="() => toggleGroup(group, !group.allChecked)"
                    />
                    <span>{{ group.label }}</span>
                    <span class="text-xs a-color-text-tertiary">
                      {{ group.selectedCount }}/{{ group.items.length }}
                    </span>
                  </div>
                </template>

                <a-checkbox-group
                  v-model:value="permissionIds"
                  class="flex flex-col gap-1 pl-7"
                >
                  <a-checkbox
                    v-for="item in group.items"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                    <span class="ml-2 text-xs a-color-text-tertiary">
                      {{ item.code }}
                    </span>
                  </a-checkbox>
                </a-checkbox-group>
              </a-collapse-panel>
            </a-collapse>
          </div>
        </section>

        <section class="flex h-[60vh] w-full min-h-0 flex-col md:h-auto md:w-1/2">
          <header class="mb-2 flex items-center justify-between gap-2">
            <h4 class="font-medium">菜单</h4>
            <div class="flex items-center">
              <a-button
                type="link"
                size="small"
                :disabled="loading"
                @click="toggleAllMenus(true)"
              >
                全选
              </a-button>
              <a-button
                type="link"
                size="small"
                :disabled="loading"
                @click="toggleAllMenus(false)"
              >
                清空
              </a-button>
              <a-button
                type="link"
                size="small"
                :disabled="loading"
                @click="toggleExpandAll(true)"
              >
                展开
              </a-button>
              <a-button
                type="link"
                size="small"
                :disabled="loading"
                @click="toggleExpandAll(false)"
              >
                折叠
              </a-button>
            </div>
          </header>

          <a-input
            v-model:value="menuKeyword"
            allow-clear
            placeholder="搜索菜单名称或路径"
          >
            <template #prefix>
              <AppIcon icon="i-ri:search-2-line" class="a-color-text-tertiary" />
            </template>
          </a-input>

          <div class="mt-2 min-h-0 flex-1 overflow-auto pr-1">
            <a-skeleton v-if="loading" active :paragraph="{ rows: 6 }" />
            <a-tree
              v-else-if="menuTreeData.length > 0"
              v-model:checked-keys="menuCheckedKeys"
              v-model:expanded-keys="expandedMenuKeys"
              checkable
              block-node
              :tree-data="menuTreeData"
              @check="handleMenuCheck"
            />
            <a-empty
              v-else
              :description="menuKeyword ? '没有匹配的菜单' : '暂无菜单'"
            />
          </div>

          <p class="mt-1 text-xs a-color-text-tertiary">
            勾选父节点会带上全部子菜单；停用菜单不可勾选，它本来就进不了侧边栏。
          </p>
        </section>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <a-button
          :disabled="!isDirty || loading || submitting"
          @click="resetSelection"
        >
          重置
        </a-button>
        <a-popconfirm
          v-if="isDirty"
          title="放弃未保存的授权改动？"
          ok-text="放弃"
          cancel-text="继续编辑"
          @confirm="close"
        >
          <a-button>取消</a-button>
        </a-popconfirm>
        <a-button v-else @click="close">取消</a-button>
        <a-button
          type="primary"
          :loading="submitting"
          :disabled="loading"
          @click="submit"
        >
          确定
        </a-button>
      </div>
    </template>
  </a-modal>
</template>