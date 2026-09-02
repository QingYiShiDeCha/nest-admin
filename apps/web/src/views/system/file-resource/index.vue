<script setup lang="ts">
import { App, Button, Popconfirm, Space, Tooltip } from 'antdv-next';
import type { TableColumnsType } from 'antdv-next';
import { h, ref } from 'vue';

import {
  PERMISSIONS,
  type FileCategory,
  type FileResource,
} from '@nest-admin/shared';

import {
  apiFileResourceDetail,
  apiFileResourcePage,
  apiFileResourceRemove,
  apiUploadFile,
  type FileResourceQuery,
} from '@/api/files';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import {
  FILE_CATEGORY_META,
  FILE_CATEGORY_OPTIONS,
  FILE_STORAGE_META,
  FILE_STORAGE_OPTIONS,
} from '@/constants/dicts';
import { formatDateTime, formatFileSize } from '@/utils/format';
import { resolveImageUrl } from '@/utils/image-url';

const { message } = App.useApp();
const { can } = usePermission();

const categoryIcons: Record<FileCategory, string> = {
  image: 'i-ri:image-2-line',
  video: 'i-ri:video-line',
  audio: 'i-ri:music-2-line',
  document: 'i-ri:file-text-line',
  archive: 'i-ri:file-zip-line',
  other: 'i-ri:file-3-line',
};

function resourceUrl(record: FileResource): string {
  return resolveImageUrl(record.url) ?? record.url;
}

function renderPreview(record: FileResource) {
  if (record.category === 'image') {
    return h('img', {
      src: resourceUrl(record),
      alt: record.originalName,
      class:
        'block h-11 w-11 rounded border border-solid a-border-border-secondary object-cover cursor-pointer',
      onClick: () => openDetail(record),
    });
  }

  return h(
    'div',
    {
      class:
        'h-11 w-11 inline-grid place-items-center rounded border border-solid a-border-border-secondary a-bg-fill-tertiary a-color-text-secondary',
    },
    [h('i', { class: [categoryIcons[record.category], 'text-xl'] })],
  );
}

const columns: TableColumnsType<FileResource> = [
  {
    title: '预览',
    key: 'preview',
    width: 76,
    render: (_value, record) => renderPreview(record),
  },
  {
    title: '文件信息',
    key: 'file',
    width: 280,
    render: (_value, record) =>
      h('div', { class: 'min-w-0' }, [
        h(
          'div',
          {
            class: 'truncate font-medium a-color-text',
            title: record.originalName,
          },
          record.originalName,
        ),
        h(
          'div',
          {
            class: 'mt-0.5 truncate text-xs a-color-text-tertiary',
            title: record.mimeType,
          },
          record.mimeType,
        ),
      ]),
  },
  {
    title: '分类',
    key: 'category',
    width: 90,
    render: (_value, record) =>
      h(
        AppTag,
        { tone: FILE_CATEGORY_META[record.category].tone },
        () => FILE_CATEGORY_META[record.category].label,
      ),
  },
  {
    title: '大小',
    key: 'size',
    width: 105,
    render: (_value, record) => formatFileSize(record.size),
  },
  {
    title: '存储',
    key: 'storage',
    width: 85,
    render: (_value, record) =>
      h(
        AppTag,
        { tone: FILE_STORAGE_META[record.storage].tone },
        () => FILE_STORAGE_META[record.storage].label,
      ),
  },
  {
    title: '上传人',
    key: 'uploaderUsername',
    width: 120,
    render: (_value, record) => record.uploaderUsername ?? '系统',
  },
  {
    title: '引用',
    key: 'referenceCount',
    width: 90,
    render: (_value, record) =>
      h(
        AppTag,
        { tone: record.referenceCount > 0 ? 'success' : 'default' },
        () => `${record.referenceCount} 处`,
      ),
  },
  {
    title: '上传时间',
    key: 'createdAt',
    width: 170,
    render: (_value, record) => formatDateTime(record.createdAt),
  },
  {
    title: '操作',
    key: 'action',
    width: 230,
    fixed: 'right',
    render: (_value, record) =>
      h(Space, null, {
        default: () => [
          can(PERMISSIONS.FILE_READ)
            ? h(
                Button,
                {
                  type: 'link',
                  size: 'small',
                  onClick: () => openDetail(record),
                },
                () => '详情',
              )
            : null,
          h(
            Button,
            {
              type: 'link',
              size: 'small',
              onClick: () => openResource(record),
            },
            () => '打开',
          ),
          h(
            Button,
            {
              type: 'link',
              size: 'small',
              onClick: () => copyAddress(record),
            },
            () => '复制地址',
          ),
          can(PERMISSIONS.FILE_DELETE) && record.referenceCount === 0
            ? h(
                Popconfirm,
                {
                  title: `确认删除「${record.originalName}」？`,
                  description: '将同时删除存储中的物理文件，且无法恢复',
                  onConfirm: () => removeResource(record),
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
          can(PERMISSIONS.FILE_DELETE) && record.referenceCount > 0
            ? h(
                Tooltip,
                { title: '文件仍被业务引用，请先解除引用' },
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

const table = useTable<FileResource, FileResourceQuery>({
  columns,
  filters: { keyword: '', category: '', storage: '' },
  fetcher: apiFileResourcePage,
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<FileResourceQuery>[] = [
  {
    label: '关键词',
    key: 'keyword',
    placeholder: '文件名、MIME、对象键或上传人',
  },
  {
    label: '文件分类',
    key: 'category',
    type: 'select',
    options: FILE_CATEGORY_OPTIONS,
  },
  {
    label: '存储位置',
    key: 'storage',
    type: 'select',
    options: FILE_STORAGE_OPTIONS,
  },
];

const uploadInput = ref<HTMLInputElement>();
const uploading = ref(false);

function chooseFile(): void {
  uploadInput.value?.click();
}

async function uploadSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  uploading.value = true;
  try {
    await apiUploadFile(file);
    void message.success(`文件 ${file.name} 上传成功`);
    await table.search();
  } finally {
    uploading.value = false;
  }
}

const detailOpen = ref(false);
const detailLoading = ref(false);
const current = ref<FileResource>();

async function openDetail(record: FileResource): Promise<void> {
  current.value = record;
  detailOpen.value = true;
  detailLoading.value = true;
  try {
    current.value = await apiFileResourceDetail(record.id);
  } finally {
    detailLoading.value = false;
  }
}

function openResource(record: FileResource): void {
  window.open(resourceUrl(record), '_blank', 'noopener,noreferrer');
}

async function copyAddress(record: FileResource): Promise<void> {
  try {
    const url = new URL(resourceUrl(record), window.location.origin).href;
    await navigator.clipboard.writeText(url);
    void message.success('文件地址已复制');
  } catch {
    void message.error('复制失败，请检查浏览器剪贴板权限');
  }
}

async function removeResource(record: FileResource): Promise<void> {
  await apiFileResourceRemove(record.id);
  if (current.value?.id === record.id) detailOpen.value = false;
  void message.success(`已删除文件 ${record.originalName}`);
  await table.reload();
}

defineOptions({ name: 'FileResourcePage' });
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />

    <ProTable :table="table" row-key="id">
      <template #toolbar>
        <a-button type="primary" :loading="uploading" @click="chooseFile">
          <template #icon><i class="i-ri:upload-2-line" /></template>
          上传文件
        </a-button>
        <input
          ref="uploadInput"
          class="hidden"
          type="file"
          @change="uploadSelected"
        />
      </template>
    </ProTable>

    <a-drawer
      v-model:open="detailOpen"
      title="文件详情"
      size="560px"
      :loading="detailLoading"
    >
      <template v-if="current">
        <div
          class="mb-5 min-h-48 flex items-center justify-center overflow-hidden rounded-lg border border-solid a-border-border-secondary a-bg-fill-tertiary p-4"
        >
          <a-image
            v-if="current.category === 'image'"
            :src="resourceUrl(current)"
            :alt="current.originalName"
            class="max-h-72 max-w-full object-contain"
          />
          <video
            v-else-if="current.category === 'video'"
            :src="resourceUrl(current)"
            class="max-h-72 max-w-full"
            controls
          />
          <audio
            v-else-if="current.category === 'audio'"
            :src="resourceUrl(current)"
            class="w-full"
            controls
          />
          <i
            v-else
            :class="[categoryIcons[current.category], 'text-6xl text-primary']"
          />
        </div>

        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="原始文件名">
            {{ current.originalName }}
          </a-descriptions-item>
          <a-descriptions-item label="对象键">
            <span class="break-all font-mono text-xs">{{ current.key }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="访问地址">
            <span class="break-all text-xs">{{ current.url }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="MIME / 扩展名">
            {{ current.mimeType }} / {{ current.extension ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="分类 / 存储">
            {{ FILE_CATEGORY_META[current.category].label }} /
            {{ FILE_STORAGE_META[current.storage].label }}
          </a-descriptions-item>
          <a-descriptions-item label="文件大小">
            {{ formatFileSize(current.size) }}
          </a-descriptions-item>
          <a-descriptions-item label="上传人">
            {{ current.uploaderUsername ?? '系统' }}
          </a-descriptions-item>
          <a-descriptions-item label="业务引用">
            {{ current.referenceCount }} 处
          </a-descriptions-item>
          <a-descriptions-item label="上传时间">
            {{ formatDateTime(current.createdAt) }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="mt-5 flex justify-end gap-2">
          <a-button @click="copyAddress(current)">复制地址</a-button>
          <a-button type="primary" @click="openResource(current)">
            打开文件
          </a-button>
        </div>
      </template>
    </a-drawer>
  </section>
</template>
