<script setup lang="ts">
import { App, Button, Popconfirm, Space } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import dayjs from 'dayjs';
import { computed, h, reactive, ref } from 'vue';

import {
  PERMISSIONS,
  type NoticeDetail,
  type NoticeListItem,
  type NoticePriority,
  type NoticeTargetOption,
  type NoticeTargetType,
  type NoticeType,
} from '@nest-admin/shared';

import {
  apiNoticeCreate,
  apiNoticeDetail,
  apiNoticePage,
  apiNoticePublish,
  apiNoticeRemove,
  apiNoticeTargetOptions,
  apiNoticeUpdate,
  apiNoticeWithdraw,
  type NoticePayload,
  type NoticeQuery,
} from '@/api/notices';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import {
  NOTICE_PRIORITY_META,
  NOTICE_PRIORITY_OPTIONS,
  NOTICE_STATUS_META,
  NOTICE_STATUS_OPTIONS,
  NOTICE_TARGET_META,
  NOTICE_TARGET_OPTIONS,
  NOTICE_TYPE_META,
  NOTICE_TYPE_OPTIONS,
} from '@/constants/dicts';
import { useNotificationsStore } from '@/stores/notifications';
import { formatDateTime } from '@/utils/format';

const { message } = App.useApp();
const { can } = usePermission();
const notifications = useNotificationsStore();

const columns: TableColumnsType<NoticeListItem> = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: '类型',
    key: 'type',
    width: 90,
    render: (_value, record) =>
      h(AppTag, { tone: NOTICE_TYPE_META[record.type].tone }, () =>
        NOTICE_TYPE_META[record.type].label,
      ),
  },
  {
    title: '优先级',
    key: 'priority',
    width: 90,
    render: (_value, record) =>
      h(AppTag, { tone: NOTICE_PRIORITY_META[record.priority].tone }, () =>
        NOTICE_PRIORITY_META[record.priority].label,
      ),
  },
  {
    title: '接收范围',
    key: 'target',
    width: 120,
    render: (_value, record) =>
      record.targetType === 'all'
        ? NOTICE_TARGET_META.all
        : `${NOTICE_TARGET_META[record.targetType]}（${record.targetCount}）`,
  },
  {
    title: '阅读情况',
    key: 'read',
    width: 110,
    align: 'center',
    render: (_value, record) =>
      record.status === 'published'
        ? `${record.readCount} / ${record.recipientCount}`
        : '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (_value, record) =>
      h(AppTag, { tone: NOTICE_STATUS_META[record.status].tone }, () =>
        NOTICE_STATUS_META[record.status].label,
      ),
  },
  {
    title: '发布时间',
    key: 'publishedAt',
    width: 170,
    render: (_value, record) => formatDateTime(record.publishedAt),
  },
  {
    title: '操作',
    key: 'action',
    width: 250,
    fixed: 'right',
    render: (_value, record) =>
      h(Space, { size: 4 }, {
        default: () => [
          can(PERMISSIONS.NOTICE_READ)
            ? h(
                Button,
                { type: 'link', size: 'small', onClick: () => openDetail(record.id) },
                () => '详情',
              )
            : null,
          can(PERMISSIONS.NOTICE_UPDATE) && record.status !== 'published'
            ? h(
                Button,
                { type: 'link', size: 'small', onClick: () => openEdit(record.id) },
                () => '编辑',
              )
            : null,
          can(PERMISSIONS.NOTICE_PUBLISH) && record.status !== 'published'
            ? h(
                Popconfirm,
                {
                  title: '确认发布该公告？',
                  description: '发布后将按当前范围生成收件人快照',
                  onConfirm: () => publish(record),
                },
                {
                  default: () =>
                    h(Button, { type: 'link', size: 'small' }, () => '发布'),
                },
              )
            : null,
          can(PERMISSIONS.NOTICE_WITHDRAW) && record.status === 'published'
            ? h(
                Popconfirm,
                {
                  title: '确认撤回该公告？',
                  description: '撤回后用户收件箱将不再展示',
                  onConfirm: () => withdraw(record),
                },
                {
                  default: () =>
                    h(Button, { type: 'link', size: 'small' }, () => '撤回'),
                },
              )
            : null,
          can(PERMISSIONS.NOTICE_DELETE) && record.status !== 'published'
            ? h(
                Popconfirm,
                {
                  title: '确认删除该公告？',
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
        ],
      }),
  },
];

const table = useTable<NoticeListItem, NoticeQuery>({
  columns,
  filters: { keyword: '', type: '', priority: '', status: '' },
  fetcher: apiNoticePage,
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<NoticeQuery>[] = [
  { label: '标题', key: 'keyword' },
  { label: '类型', key: 'type', type: 'select', options: NOTICE_TYPE_OPTIONS },
  {
    label: '优先级',
    key: 'priority',
    type: 'select',
    options: NOTICE_PRIORITY_OPTIONS,
  },
  {
    label: '状态',
    key: 'status',
    type: 'select',
    options: NOTICE_STATUS_OPTIONS,
  },
];

const modalOpen = ref(false);
const editing = ref<NoticeDetail | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const targetLoading = ref(false);
const targetOptions = ref<NoticeTargetOption[]>([]);
let targetSearchTimer: ReturnType<typeof setTimeout> | undefined;

const form = reactive({
  title: '',
  content: '',
  type: 'notice' as NoticeType,
  priority: 'normal' as NoticePriority,
  targetType: 'all' as NoticeTargetType,
  targetIds: [] as number[],
  expiresAt: null as string | null,
});

const selectOptions = computed(() =>
  targetOptions.value.map((item) => ({
    value: item.id,
    label: item.label,
    description: item.description,
  })),
);

const rules = {
  title: [{ required: true, whitespace: true, message: '请输入标题' }],
  content: [{ required: true, whitespace: true, message: '请输入正文' }],
  targetType: [{ required: true, message: '请选择接收范围' }],
};

function resetForm(): void {
  editing.value = null;
  targetOptions.value = [];
  Object.assign(form, {
    title: '',
    content: '',
    type: 'notice',
    priority: 'normal',
    targetType: 'all',
    targetIds: [],
    expiresAt: null,
  });
}

function openCreate(): void {
  resetForm();
  modalOpen.value = true;
}

async function openEdit(id: number): Promise<void> {
  const detail = await apiNoticeDetail(id);
  editing.value = detail;
  targetOptions.value = [...detail.targets];
  Object.assign(form, {
    title: detail.title,
    content: detail.content,
    type: detail.type,
    priority: detail.priority,
    targetType: detail.targetType,
    targetIds: detail.targets.map((target) => target.id),
    expiresAt: detail.expiresAt
      ? dayjs(detail.expiresAt).format('YYYY-MM-DD HH:mm:ss')
      : null,
  });
  modalOpen.value = true;
  if (detail.targetType !== 'all') void loadTargetOptions(detail.targetType);
}

function changeTargetType(value: NoticeTargetType): void {
  form.targetType = value;
  form.targetIds = [];
  targetOptions.value = [];
  if (value !== 'all') void loadTargetOptions(value);
}

async function loadTargetOptions(
  targetType: Exclude<NoticeTargetType, 'all'>,
  keyword?: string,
): Promise<void> {
  targetLoading.value = true;
  try {
    const result = await apiNoticeTargetOptions(targetType, keyword);
    const selected = targetOptions.value.filter((option) =>
      form.targetIds.includes(option.id),
    );
    targetOptions.value = [
      ...selected,
      ...result.filter(
        (option) => !selected.some((current) => current.id === option.id),
      ),
    ];
  } finally {
    targetLoading.value = false;
  }
}

function searchTargets(keyword: string): void {
  if (form.targetType !== 'user') return;
  if (targetSearchTimer) clearTimeout(targetSearchTimer);
  targetSearchTimer = setTimeout(
    () => void loadTargetOptions('user', keyword.trim()),
    300,
  );
}

async function submit(): Promise<void> {
  await formRef.value?.validate();
  if (form.targetType !== 'all' && form.targetIds.length === 0) {
    void message.warning('请至少选择一个接收对象');
    return;
  }

  const payload: NoticePayload = {
    title: form.title.trim(),
    content: form.content.trim(),
    type: form.type,
    priority: form.priority,
    targetType: form.targetType,
    targetIds: form.targetType === 'all' ? [] : [...form.targetIds],
    expiresAt: form.expiresAt ? dayjs(form.expiresAt).toISOString() : null,
  };

  submitting.value = true;
  try {
    if (editing.value) {
      await apiNoticeUpdate(editing.value.id, payload);
      void message.success('公告已更新');
    } else {
      await apiNoticeCreate(payload);
      void message.success('公告草稿已创建');
    }
    modalOpen.value = false;
    await table.reload();
  } finally {
    submitting.value = false;
  }
}

async function publish(record: NoticeListItem): Promise<void> {
  await apiNoticePublish(record.id);
  void message.success('公告已发布');
  await Promise.all([table.reload(), notifications.refreshUnreadCount()]);
}

async function withdraw(record: NoticeListItem): Promise<void> {
  await apiNoticeWithdraw(record.id);
  void message.success('公告已撤回');
  await Promise.all([table.reload(), notifications.refreshUnreadCount()]);
}

async function remove(record: NoticeListItem): Promise<void> {
  await apiNoticeRemove(record.id);
  void message.success('公告已删除');
  await table.reload();
}

const detailOpen = ref(false);
const current = ref<NoticeDetail | null>(null);
const detailLoading = ref(false);

async function openDetail(id: number): Promise<void> {
  detailOpen.value = true;
  detailLoading.value = true;
  try {
    current.value = await apiNoticeDetail(id);
  } finally {
    detailLoading.value = false;
  }
}

defineOptions({ name: 'NoticePage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <div class="flex items-center gap-3">
          <a-button
            v-permission="PERMISSIONS.NOTICE_CREATE"
            type="primary"
            @click="openCreate"
          >
            新增公告
          </a-button>
          <span class="text-sm a-color-text-tertiary">
            发布时固定接收人，后续组织和角色变化不影响历史
          </span>
        </div>
      </template>
    </ProTable>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑公告：${editing.title}` : '新增公告'"
      :confirm-loading="submitting"
      width="920px"
      destroy-on-hidden
      @ok="submit"
    >
      <a-form
        ref="formRef"
        class="grid grid-cols-1 gap-x-5 md:grid-cols-2"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item class="md:col-span-2" label="标题" name="title">
          <a-input v-model:value="form.title" :maxlength="128" show-count />
        </a-form-item>
        <a-form-item label="类型" name="type">
          <a-select v-model:value="form.type" :options="NOTICE_TYPE_OPTIONS" />
        </a-form-item>
        <a-form-item label="优先级" name="priority">
          <a-select
            v-model:value="form.priority"
            :options="NOTICE_PRIORITY_OPTIONS"
          />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="接收范围" name="targetType">
          <a-radio-group
            :value="form.targetType"
            :options="NOTICE_TARGET_OPTIONS"
            @update:value="changeTargetType"
          />
        </a-form-item>
        <a-form-item
          v-if="form.targetType !== 'all'"
          class="md:col-span-2"
          label="接收对象"
          name="targetIds"
        >
          <a-select
            v-model:value="form.targetIds"
            mode="multiple"
            class="w-full"
            :options="selectOptions"
            :loading="targetLoading"
            :filter-option="form.targetType === 'user' ? false : true"
            show-search
            placeholder="请选择接收对象"
            @search="searchTargets"
          >
            <template #option="option">
              <div class="flex items-center justify-between gap-3">
                <span>{{ option.label }}</span>
                <span class="text-xs a-color-text-tertiary">{{ option.description }}</span>
              </div>
            </template>
          </a-select>
        </a-form-item>
        <a-form-item class="md:col-span-2" label="过期时间" name="expiresAt">
          <a-date-picker
            v-model:value="form.expiresAt"
            class="w-full"
            value-format="YYYY-MM-DD HH:mm:ss"
            show-time
            allow-clear
            placeholder="不设置则长期有效"
          />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="正文" name="content">
          <a-textarea
            v-model:value="form.content"
            :rows="10"
            :maxlength="10000"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="detailOpen"
      title="公告详情"
      :size="680"
      destroy-on-hidden
    >
      <a-skeleton v-if="detailLoading" active :paragraph="{ rows: 9 }" />
      <article v-else-if="current">
        <div class="flex flex-wrap items-center gap-2">
          <AppTag :tone="NOTICE_TYPE_META[current.type].tone">
            {{ NOTICE_TYPE_META[current.type].label }}
          </AppTag>
          <AppTag :tone="NOTICE_PRIORITY_META[current.priority].tone">
            {{ NOTICE_PRIORITY_META[current.priority].label }}
          </AppTag>
          <AppTag :tone="NOTICE_STATUS_META[current.status].tone">
            {{ NOTICE_STATUS_META[current.status].label }}
          </AppTag>
        </div>
        <h2 class="mt-3 mb-0 text-xl font-semibold a-color-text">{{ current.title }}</h2>
        <a-descriptions class="mt-4" :column="1" size="small" bordered>
          <a-descriptions-item label="接收范围">
            {{ NOTICE_TARGET_META[current.targetType] }}
            <span v-if="current.targets.length > 0">
              ：{{ current.targets.map((item) => item.label).join('、') }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="发布人">
            {{ current.publisherName ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="发布时间">
            {{ formatDateTime(current.publishedAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="过期时间">
            {{ formatDateTime(current.expiresAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="阅读情况">
            {{ current.readCount }} / {{ current.recipientCount }}
          </a-descriptions-item>
        </a-descriptions>
        <div class="my-5 border-t border-solid a-border-border-secondary" />
        <div class="whitespace-pre-wrap break-words leading-7 a-color-text">
          {{ current.content }}
        </div>
      </article>
    </a-drawer>
  </section>
</template>
