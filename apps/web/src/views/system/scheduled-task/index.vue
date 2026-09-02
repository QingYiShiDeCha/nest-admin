<script setup lang="ts">
import { App, Button, Popconfirm, Space, Switch, Tooltip } from 'antdv-next';
import type { FormInstance, TableColumnsType } from 'antdv-next';
import { computed, h, onMounted, reactive, ref } from 'vue';

import {
  DEFAULT_SCHEDULED_TASK_TIMEZONE,
  PERMISSIONS,
  type ScheduledTask,
  type ScheduledTaskDefinition,
  type ScheduledTaskExecutionStatus,
  type ScheduledTaskLog,
  type Status,
} from '@nest-admin/shared';

import {
  apiScheduledTaskCreate,
  apiScheduledTaskDefinitions,
  apiScheduledTaskLogPage,
  apiScheduledTaskPage,
  apiScheduledTaskRemove,
  apiScheduledTaskRun,
  apiScheduledTaskUpdate,
  type ScheduledTaskLogQuery,
  type ScheduledTaskPayload,
  type ScheduledTaskQuery,
} from '@/api/scheduled-tasks';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import {
  SCHEDULED_TASK_EXECUTION_STATUS_META,
  SCHEDULED_TASK_EXECUTION_STATUS_OPTIONS,
  SCHEDULED_TASK_TRIGGER_TYPE_META,
  SCHEDULED_TASK_TRIGGER_TYPE_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/constants/dicts';
import { formatDateTime } from '@/utils/format';

const { message } = App.useApp();
const { can } = usePermission();
const definitions = ref<ScheduledTaskDefinition[]>([]);
const runningTaskId = ref<number | null>(null);

const definitionOptions = computed(() =>
  definitions.value.map((item) => ({
    label: `${item.name} (${item.key})`,
    value: item.key,
  })),
);
const timezoneOptions = [
  DEFAULT_SCHEDULED_TASK_TIMEZONE,
  'UTC',
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
].map((value) => ({ value }));

function statusTag(status: Status) {
  return h(
    AppTag,
    { tone: STATUS_META[status].color },
    () => STATUS_META[status].label,
  );
}

function executionStatusTag(status: ScheduledTaskExecutionStatus | null) {
  if (!status) return '—';
  const meta = SCHEDULED_TASK_EXECUTION_STATUS_META[status];
  return h(AppTag, { tone: meta.tone }, () => meta.label);
}

const columns: TableColumnsType<ScheduledTask> = [
  {
    title: '计划名称',
    key: 'name',
    width: 190,
    render: (_value, record) =>
      h('div', { class: 'min-w-0' }, [
        h(
          'div',
          { class: 'truncate font-medium', title: record.name },
          record.name,
        ),
        h(
          'div',
          {
            class: 'truncate font-mono text-xs a-color-text-tertiary',
            title: record.taskKey,
          },
          record.taskKey,
        ),
      ]),
  },
  {
    title: 'Cron',
    key: 'cronExpression',
    width: 160,
    render: (_value, record) =>
      h('span', { class: 'font-mono text-xs' }, record.cronExpression),
  },
  { title: '时区', dataIndex: 'timezone', key: 'timezone', width: 140 },
  {
    title: '状态',
    key: 'status',
    width: 105,
    render: (_value, record) =>
      can(PERMISSIONS.SCHEDULED_TASK_UPDATE)
        ? h(
            Space,
            { size: 6 },
            {
              default: () => [
                h(Switch, {
                  checked: record.status === 'active',
                  size: 'small',
                  onChange: (checked: boolean) => changeStatus(record, checked),
                }),
                statusTag(record.status),
              ],
            },
          )
        : statusTag(record.status),
  },
  {
    title: '上次执行',
    key: 'lastRunAt',
    width: 170,
    render: (_value, record) => formatDateTime(record.lastRunAt),
  },
  {
    title: '结果',
    key: 'lastRunStatus',
    width: 90,
    render: (_value, record) => executionStatusTag(record.lastRunStatus),
  },
  {
    title: '下次执行',
    key: 'nextRunAt',
    width: 170,
    render: (_value, record) => formatDateTime(record.nextRunAt),
  },
  {
    title: '操作',
    key: 'action',
    width: 235,
    fixed: 'right',
    render: (_value, record) =>
      h(Space, null, {
        default: () => [
          can(PERMISSIONS.SCHEDULED_TASK_RUN)
            ? h(
                Popconfirm,
                {
                  title: `立即执行「${record.name}」？`,
                  onConfirm: () => runTask(record),
                },
                {
                  default: () =>
                    h(
                      Button,
                      {
                        type: 'link',
                        size: 'small',
                        loading: runningTaskId.value === record.id,
                      },
                      () => '执行',
                    ),
                },
              )
            : null,
          can(PERMISSIONS.SCHEDULED_TASK_LOG_LIST)
            ? h(
                Button,
                {
                  type: 'link',
                  size: 'small',
                  onClick: () => openLogs(record),
                },
                () => '日志',
              )
            : null,
          can(PERMISSIONS.SCHEDULED_TASK_UPDATE)
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
          can(PERMISSIONS.SCHEDULED_TASK_DELETE) && !record.builtIn
            ? h(
                Popconfirm,
                {
                  title: '确认删除该计划？',
                  description: '历史执行日志仍会保留',
                  onConfirm: () => removeTask(record),
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
          can(PERMISSIONS.SCHEDULED_TASK_DELETE) && record.builtIn
            ? h(
                Tooltip,
                { title: '内置计划不可删除' },
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

const table = useTable<ScheduledTask, ScheduledTaskQuery>({
  columns,
  filters: { keyword: '', status: '' },
  fetcher: apiScheduledTaskPage,
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<ScheduledTaskQuery>[] = [
  { label: '关键词', key: 'keyword', placeholder: '计划名称或任务键' },
  { label: '状态', key: 'status', type: 'select', options: STATUS_OPTIONS },
];

const modalOpen = ref(false);
const editing = ref<ScheduledTask | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  name: '',
  taskKey: '',
  cronExpression: '0 3 * * *',
  timezone: DEFAULT_SCHEDULED_TASK_TIMEZONE,
  status: 'active' as Status,
  remark: '',
});
const formRules = {
  name: [{ required: true, message: '请输入计划名称' }],
  taskKey: [{ required: true, message: '请选择任务处理器' }],
  cronExpression: [{ required: true, message: '请输入 Cron 表达式' }],
  timezone: [{ required: true, message: '请输入时区' }],
};

function resetForm(): void {
  Object.assign(form, {
    name: '',
    taskKey: definitions.value[0]?.key ?? '',
    cronExpression: '0 3 * * *',
    timezone: DEFAULT_SCHEDULED_TASK_TIMEZONE,
    status: 'active',
    remark: '',
  });
}

function openCreate(): void {
  editing.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(record: ScheduledTask): void {
  editing.value = record;
  Object.assign(form, {
    name: record.name,
    taskKey: record.taskKey,
    cronExpression: record.cronExpression,
    timezone: record.timezone,
    status: record.status,
    remark: record.remark ?? '',
  });
  modalOpen.value = true;
}

async function submit(): Promise<void> {
  await formRef.value?.validate();
  const payload: ScheduledTaskPayload = {
    name: form.name,
    taskKey: form.taskKey,
    cronExpression: form.cronExpression.trim(),
    timezone: form.timezone,
    status: form.status,
    remark: form.remark || undefined,
  };

  submitting.value = true;
  try {
    if (editing.value) {
      await apiScheduledTaskUpdate(editing.value.id, payload);
      void message.success('定时计划已更新');
    } else {
      await apiScheduledTaskCreate(payload);
      void message.success('定时计划已创建');
    }
    modalOpen.value = false;
    await table.reload();
  } finally {
    submitting.value = false;
  }
}

async function changeStatus(
  record: ScheduledTask,
  checked: boolean,
): Promise<void> {
  await apiScheduledTaskUpdate(record.id, {
    status: checked ? 'active' : 'disabled',
  });
  void message.success(checked ? '计划已启用' : '计划已停用');
  await table.reload();
}

async function runTask(record: ScheduledTask): Promise<void> {
  runningTaskId.value = record.id;
  try {
    await apiScheduledTaskRun(record.id);
    void message.success('任务已触发，可在执行日志中查看结果');
    await table.reload();
  } finally {
    runningTaskId.value = null;
  }
}

async function removeTask(record: ScheduledTask): Promise<void> {
  await apiScheduledTaskRemove(record.id);
  void message.success(`已删除计划 ${record.name}`);
  await table.reload();
}

const selectedTask = ref<ScheduledTask | null>(null);
const logsOpen = ref(false);
const logDetailOpen = ref(false);
const currentLog = ref<ScheduledTaskLog | null>(null);

const logColumns: TableColumnsType<ScheduledTaskLog> = [
  {
    title: '开始时间',
    key: 'startedAt',
    width: 170,
    render: (_value, record) => formatDateTime(record.startedAt),
  },
  {
    title: '触发方式',
    key: 'triggerType',
    width: 90,
    render: (_value, record) => {
      const meta = SCHEDULED_TASK_TRIGGER_TYPE_META[record.triggerType];
      return h(AppTag, { tone: meta.tone }, () => meta.label);
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (_value, record) => executionStatusTag(record.status),
  },
  {
    title: '耗时',
    key: 'durationMs',
    width: 90,
    render: (_value, record) =>
      record.durationMs === null ? '—' : `${record.durationMs}ms`,
  },
  {
    title: '操作人',
    key: 'operatorUsername',
    width: 120,
    render: (_value, record) => record.operatorUsername ?? '系统调度',
  },
  {
    title: '完成时间',
    key: 'finishedAt',
    width: 170,
    render: (_value, record) => formatDateTime(record.finishedAt),
  },
  {
    title: '操作',
    key: 'detail',
    width: 80,
    fixed: 'right',
    render: (_value, record) =>
      h(
        Button,
        { type: 'link', size: 'small', onClick: () => openLogDetail(record) },
        () => '详情',
      ),
  },
];

const logTable = useTable<ScheduledTaskLog, ScheduledTaskLogQuery>({
  columns: logColumns,
  filters: { status: '', triggerType: '' },
  fetcher: (query) =>
    selectedTask.value
      ? apiScheduledTaskLogPage(selectedTask.value.id, query)
      : Promise.resolve({
          list: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }),
  onError: (text) => void message.error(text),
});

const logFilterFields: FilterField<ScheduledTaskLogQuery>[] = [
  {
    label: '执行状态',
    key: 'status',
    type: 'select',
    options: SCHEDULED_TASK_EXECUTION_STATUS_OPTIONS,
  },
  {
    label: '触发方式',
    key: 'triggerType',
    type: 'select',
    options: SCHEDULED_TASK_TRIGGER_TYPE_OPTIONS,
  },
];

async function openLogs(record: ScheduledTask): Promise<void> {
  selectedTask.value = record;
  logsOpen.value = true;
  await logTable.reset();
}

function openLogDetail(record: ScheduledTaskLog): void {
  currentLog.value = record;
  logDetailOpen.value = true;
}

onMounted(async () => {
  try {
    definitions.value = await apiScheduledTaskDefinitions();
  } catch (error) {
    void message.error(
      error instanceof Error ? error.message : '任务定义加载失败',
    );
  }
});

defineOptions({ name: 'ScheduledTaskPage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <a-button
          v-permission="PERMISSIONS.SCHEDULED_TASK_CREATE"
          type="primary"
          @click="openCreate"
        >
          新增计划
        </a-button>
      </template>
    </ProTable>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? `编辑计划：${editing.name}` : '新增计划'"
      :confirm-loading="submitting"
      width="820px"
      @ok="submit"
    >
      <a-form
        ref="formRef"
        class="grid grid-cols-1 gap-x-5 md:grid-cols-2"
        :model="form"
        :rules="formRules"
        layout="vertical"
      >
        <a-form-item label="计划名称" name="name">
          <a-input v-model:value="form.name" :maxlength="64" />
        </a-form-item>
        <a-form-item label="任务处理器" name="taskKey">
          <a-select
            v-model:value="form.taskKey"
            :disabled="editing?.builtIn"
            :options="definitionOptions"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item label="Cron 表达式" name="cronExpression">
          <a-input
            v-model:value="form.cronExpression"
            class="font-mono"
            :maxlength="64"
            placeholder="0 3 * * *"
          />
        </a-form-item>
        <a-form-item label="时区" name="timezone">
          <a-auto-complete
            v-model:value="form.timezone"
            :options="timezoneOptions"
            :maxlength="64"
          />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group
            v-model:value="form.status"
            :options="STATUS_OPTIONS"
          />
        </a-form-item>
        <a-form-item class="md:col-span-2" label="备注" name="remark">
          <a-textarea v-model:value="form.remark" :rows="3" :maxlength="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="logsOpen"
      :title="`执行日志：${selectedTask?.name ?? ''}`"
      :size="960"
    >
      <div class="h-full flex flex-col min-h-0 gap-4">
        <ProSearch :table="logTable" :fields="logFilterFields" />
        <ProTable :table="logTable" row-key="id" />
      </div>
    </a-drawer>

    <a-modal
      v-model:open="logDetailOpen"
      title="执行详情"
      :footer="null"
      width="720px"
    >
      <a-descriptions v-if="currentLog" :column="1" size="small" bordered>
        <a-descriptions-item label="计划 / 任务键">
          {{ currentLog.taskName }} /
          <span class="font-mono">{{ currentLog.taskKey }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="触发方式">
          {{ SCHEDULED_TASK_TRIGGER_TYPE_META[currentLog.triggerType].label }}
        </a-descriptions-item>
        <a-descriptions-item label="执行状态">
          {{ SCHEDULED_TASK_EXECUTION_STATUS_META[currentLog.status].label }}
        </a-descriptions-item>
        <a-descriptions-item label="开始 / 结束">
          {{ formatDateTime(currentLog.startedAt) }} /
          {{ formatDateTime(currentLog.finishedAt) }}
        </a-descriptions-item>
        <a-descriptions-item label="耗时">
          {{
            currentLog.durationMs === null ? '—' : `${currentLog.durationMs}ms`
          }}
        </a-descriptions-item>
        <a-descriptions-item label="操作人">
          {{ currentLog.operatorUsername ?? '系统调度' }}
        </a-descriptions-item>
        <a-descriptions-item v-if="currentLog.result" label="执行结果">
          <pre
            class="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs"
            >{{ currentLog.result }}</pre>
        </a-descriptions-item>
        <a-descriptions-item v-if="currentLog.errorMessage" label="错误信息">
          <span class="break-all text-error">{{
            currentLog.errorMessage
          }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </section>
</template>
