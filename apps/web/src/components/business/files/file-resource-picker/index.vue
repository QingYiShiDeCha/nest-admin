<script setup lang="ts">
import type {
  FileCategory,
  FileResource,
  FileUploadResult,
} from '@nest-admin/shared';
import { FILE_CATEGORY } from '@nest-admin/shared';
import { App } from 'antdv-next';
import { computed, ref, shallowRef, watch } from 'vue';

import {
  apiFileResourcePage,
  apiMyFileResourcePage,
  apiUploadFile,
} from '@/api/files';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import { FILE_CATEGORY_META } from '@/constants/dicts';
import { formatFileSize } from '@/utils/format';
import { resolveImageUrl } from '@/utils/image-url';

defineOptions({ name: 'FileResourcePicker' });

type ResourceScope = 'mine' | 'all';
type SelectionMode = 'single' | 'multiple';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    scope?: ResourceScope;
    mode?: SelectionMode;
    maxCount?: number;
    categories?: readonly FileCategory[];
    selectedUrls?: readonly string[];
    accept?: string;
    maxFileSize?: number;
  }>(),
  {
    title: '选择文件资源',
    scope: 'mine',
    mode: 'single',
    maxCount: 6,
    categories: () => [...FILE_CATEGORY],
    selectedUrls: () => [],
    accept: undefined,
    maxFileSize: undefined,
  },
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [resources: FileResource[]];
}>();

const { message } = App.useApp();
const pageSize = 15;
const records = shallowRef<FileResource[]>([]);
const selected = shallowRef(new Map<number, FileResource>());
const failedPreviews = shallowRef(new Set<number>());
const loading = ref(false);
const uploading = ref(false);
const page = ref(1);
const total = ref(0);
const searchInput = ref('');
const keyword = ref('');
const currentCategory = ref<FileCategory | ''>('');
const uploadInput = ref<HTMLInputElement>();
let requestVersion = 0;
let selectionInitialized = false;

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

const availableCategories = computed(() =>
  FILE_CATEGORY.filter((category) => props.categories.includes(category)),
);
const categoryOptions = computed(() =>
  availableCategories.value.map((value) => ({
    value,
    label: FILE_CATEGORY_META[value].label,
  })),
);
const selectionLimit = computed(() =>
  props.mode === 'single' ? 1 : Math.max(1, props.maxCount),
);
const selectedCount = computed(() => selected.value.size);

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

function isSelected(record: FileResource): boolean {
  return selected.value.has(record.id);
}

function replaceSelection(next: Map<number, FileResource>): void {
  selected.value = next;
}

function selectResource(record: FileResource): void {
  const next = new Map(selected.value);

  if (next.has(record.id)) {
    next.delete(record.id);
    replaceSelection(next);
    return;
  }

  if (props.mode === 'single') {
    next.clear();
  } else if (next.size >= selectionLimit.value) {
    void message.warning(`最多选择 ${selectionLimit.value} 项资源`);
    return;
  }

  next.set(record.id, record);
  replaceSelection(next);
}

function markPreviewFailed(id: number): void {
  const next = new Set(failedPreviews.value);
  next.add(id);
  failedPreviews.value = next;
}

function initializeSelection(list: FileResource[]): void {
  if (selectionInitialized) return;
  selectionInitialized = true;

  const initialUrls = new Set(props.selectedUrls);
  if (initialUrls.size === 0) return;

  const next = new Map<number, FileResource>();
  for (const record of list) {
    if (!initialUrls.has(record.url)) continue;
    next.set(record.id, record);
    if (props.mode === 'single' || next.size >= selectionLimit.value) break;
  }
  replaceSelection(next);
}

async function loadResources(targetPage = page.value): Promise<void> {
  const version = ++requestVersion;
  loading.value = true;

  try {
    const fetcher =
      props.scope === 'all' ? apiFileResourcePage : apiMyFileResourcePage;
    const result = await fetcher({
      page: targetPage,
      pageSize,
      keyword: keyword.value,
      category: currentCategory.value,
      storage: '',
    });

    if (version !== requestVersion) return;
    records.value = result.list;
    page.value = result.page;
    total.value = result.total;
    initializeSelection(result.list);
  } catch (error) {
    if (version !== requestVersion) return;
    const text = error instanceof Error ? error.message : '资源加载失败';
    void message.error(text);
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

function searchResources(): void {
  keyword.value = searchInput.value.trim().slice(0, 128);
  page.value = 1;
  void loadResources(1);
}

function selectCategory(category: FileCategory | ''): void {
  if (currentCategory.value === category) return;
  currentCategory.value = category;
  page.value = 1;
  void loadResources(1);
}

function changePage(nextPage: number): void {
  page.value = nextPage;
  void loadResources(nextPage);
}

function chooseFile(): void {
  uploadInput.value?.click();
}

function toFileResource(uploaded: FileUploadResult): FileResource {
  return { ...uploaded, referenceCount: 0 };
}

async function uploadSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (props.maxFileSize && file.size > props.maxFileSize) {
    void message.error(
      `文件大小不能超过 ${formatFileSize(props.maxFileSize)}`,
    );
    return;
  }

  uploading.value = true;
  try {
    const uploaded = await apiUploadFile(file);
    if (!availableCategories.value.includes(uploaded.category)) {
      void message.warning('文件已上传，但不属于当前允许选择的类型');
      return;
    }

    searchInput.value = '';
    keyword.value = '';
    currentCategory.value = uploaded.category;
    page.value = 1;
    await loadResources(1);

    const record =
      records.value.find((item) => item.id === uploaded.id) ??
      toFileResource(uploaded);
    selectResource(record);
    void message.success(`文件 ${uploaded.originalName} 上传成功`);
  } catch (error) {
    const text = error instanceof Error ? error.message : '文件上传失败';
    void message.error(text);
  } finally {
    uploading.value = false;
  }
}

function confirmSelection(): void {
  if (selected.value.size === 0) return;
  emit('confirm', [...selected.value.values()]);
  openModel.value = false;
}

function confirmSingleSelection(record: FileResource): void {
  if (props.mode !== 'single') return;
  if (!isSelected(record)) selectResource(record);
  confirmSelection();
}

function resetPicker(): void {
  requestVersion += 1;
  records.value = [];
  selected.value = new Map();
  failedPreviews.value = new Set();
  searchInput.value = '';
  keyword.value = '';
  currentCategory.value =
    availableCategories.value.length === 1
      ? (availableCategories.value[0] ?? '')
      : '';
  page.value = 1;
  total.value = 0;
  selectionInitialized = false;
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      requestVersion += 1;
      return;
    }

    resetPicker();
    void loadResources(1);
  },
  { immediate: true },
);
</script>

<template>
  <a-modal
    v-model:open="openModel"
    :title="title"
    :width="1040"
    :ok-text="mode === 'single' ? '使用此资源' : '使用所选资源'"
    cancel-text="取消"
    :ok-button-props="{ disabled: selectedCount === 0 }"
    :mask-closable="false"
    @ok="confirmSelection"
  >
    <div
      class="mt-3 h-[min(620px,70vh)] min-h-96 flex overflow-hidden rounded-lg border border-solid a-border-border-secondary a-bg-container"
    >
      <aside
        class="hidden w-44 shrink-0 flex-col border-r border-solid a-border-border-secondary a-bg-fill-quaternary p-3 md:flex"
      >
        <div class="px-3 py-2 text-sm font-semibold a-color-text">
          资源分类
        </div>
        <div class="mt-1 flex flex-col gap-1">
          <button
            v-if="availableCategories.length > 1"
            type="button"
            class="h-10 flex items-center gap-2 rounded-md border-0 px-3 text-left text-sm transition-colors duration-200"
            :class="
              currentCategory === ''
                ? 'a-bg-fill-secondary text-primary'
                : 'bg-transparent a-color-text-secondary hover:a-bg-fill-tertiary hover:a-color-text'
            "
            @click="selectCategory('')"
          >
            <AppIcon icon="i-ri:folder-2-line" class="text-lg" />
            <span>全部资源</span>
          </button>
          <button
            v-for="category in availableCategories"
            :key="category"
            type="button"
            class="h-10 flex items-center gap-2 rounded-md border-0 px-3 text-left text-sm transition-colors duration-200"
            :class="
              currentCategory === category
                ? 'a-bg-fill-secondary text-primary'
                : 'bg-transparent a-color-text-secondary hover:a-bg-fill-tertiary hover:a-color-text'
            "
            @click="selectCategory(category)"
          >
            <AppIcon :icon="categoryIcons[category]" class="text-lg" />
            <span>{{ FILE_CATEGORY_META[category].label }}</span>
          </button>
        </div>
        <div class="mt-auto px-3 py-2 text-xs leading-5 a-color-text-tertiary">
          {{ scope === 'mine' ? '仅展示由当前账号上传的资源' : '展示资源中心全部文件' }}
        </div>
      </aside>

      <section class="min-w-0 flex flex-1 flex-col">
        <header
          class="flex shrink-0 flex-col gap-3 border-b border-solid a-border-border-secondary p-4 sm:flex-row sm:items-center"
        >
          <a-select
            v-if="availableCategories.length > 1"
            class="w-full md:hidden sm:w-36"
            :value="currentCategory"
            :options="[
              { label: '全部资源', value: '' },
              ...categoryOptions,
            ]"
            @update:value="selectCategory"
          />
          <a-input
            v-model:value="searchInput"
            class="min-w-0 flex-1"
            allow-clear
            placeholder="搜索文件名称"
            @press-enter="searchResources"
          >
            <template #prefix>
              <AppIcon icon="i-ri:search-2-line" class="a-color-text-tertiary" />
            </template>
          </a-input>
          <div class="flex shrink-0 gap-2">
            <a-button @click="searchResources">
              <template #icon><AppIcon icon="i-ri:search-line" /></template>
              查询
            </a-button>
            <a-button type="primary" :loading="uploading" @click="chooseFile">
              <template #icon><AppIcon icon="i-ri:upload-2-line" /></template>
              上传文件
            </a-button>
            <input
              ref="uploadInput"
              class="hidden"
              type="file"
              :accept="accept"
              @change="uploadSelected"
            />
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <a-spin
            :spinning="loading"
            class="h-full [&_.ant-spin-container]:h-full"
          >
            <div
              v-if="records.length > 0"
              class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              <button
                v-for="record in records"
                :key="record.id"
                type="button"
                class="group min-w-0 rounded-md border border-solid p-2 text-left transition-colors duration-200"
                :class="
                  isSelected(record)
                    ? 'border-primary a-bg-primary-bg'
                    : 'a-border-border-secondary a-bg-container hover:border-primary hover:a-bg-fill-tertiary'
                "
                :aria-label="`选择${record.originalName}`"
                :aria-pressed="isSelected(record)"
                @click="selectResource(record)"
                @dblclick="confirmSingleSelection(record)"
              >
                <div
                  class="relative aspect-square w-full overflow-hidden rounded a-bg-fill-tertiary"
                >
                  <img
                    v-if="record.category === 'image' && !failedPreviews.has(record.id)"
                    :src="resourceUrl(record)"
                    :alt="record.originalName"
                    class="block h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                    @error="markPreviewFailed(record.id)"
                  />
                  <div
                    v-else
                    class="h-full w-full grid place-items-center a-color-text-tertiary"
                  >
                    <AppIcon :icon="categoryIcons[record.category]" class="text-4xl" />
                  </div>
                  <span
                    v-if="isSelected(record)"
                    class="absolute right-2 top-2 h-6 w-6 grid place-items-center rounded-full bg-primary text-white shadow-sm"
                  >
                    <AppIcon icon="i-ri:check-line" class="text-base" />
                  </span>
                </div>
                <span
                  class="mt-2 block truncate text-sm font-medium a-color-text"
                  :title="record.originalName"
                >
                  {{ record.originalName }}
                </span>
                <span class="mt-0.5 block text-xs a-color-text-tertiary">
                  {{ formatFileSize(record.size) }}
                </span>
              </button>
            </div>
            <div v-else class="h-full min-h-64 flex items-center justify-center">
              <a-empty description="暂无可选资源" />
            </div>
          </a-spin>
        </div>

        <footer
          class="min-h-14 flex shrink-0 items-center justify-between gap-4 border-t border-solid a-border-border-secondary px-4 py-2"
        >
          <span class="shrink-0 text-sm a-color-text-secondary">
            已选 {{ selectedCount }} / {{ selectionLimit }} 项
          </span>
          <a-pagination
            v-if="total > 0"
            :current="page"
            :page-size="pageSize"
            :total="total"
            :show-size-changer="false"
            size="small"
            show-less-items
            @change="changePage"
          />
        </footer>
      </section>
    </div>
  </a-modal>
</template>
