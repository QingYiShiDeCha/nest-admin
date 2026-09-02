import type { FileResource, PaginatedResult } from '@nest-admin/shared';
import { flushPromises, mount } from '@vue/test-utils';
import type { DefineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FileResourcePicker from '@/components/business/files/file-resource-picker/index.vue';

const mocks = vi.hoisted(() => ({
  allPage: vi.fn(),
  error: vi.fn(),
  minePage: vi.fn(),
  success: vi.fn(),
  upload: vi.fn(),
  warning: vi.fn(),
}));

const stubs = vi.hoisted(() => ({
  button: {
    name: 'AButton',
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  empty: {
    name: 'AEmpty',
    template: '<div><slot />暂无可选资源</div>',
  },
  input: {
    name: 'AInput',
    props: { value: String },
    emits: ['update:value', 'pressEnter'],
    template:
      '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" @keyup.enter="$emit(\'pressEnter\')" />',
  },
  modal: {
    name: 'AModal',
    props: { open: Boolean },
    emits: ['ok', 'update:open'],
    template:
      '<div v-if="open"><slot /><button data-testid="modal-ok" type="button" @click="$emit(\'ok\')">确定</button></div>',
  },
  pagination: {
    name: 'APagination',
    template: '<div data-testid="pagination" />',
  },
  select: {
    name: 'ASelect',
    template: '<select />',
  },
  spin: {
    name: 'ASpin',
    template: '<div><slot /></div>',
  },
}));

vi.mock('antdv-next', () => ({
  App: {
    useApp: () => ({
      message: {
        error: mocks.error,
        success: mocks.success,
        warning: mocks.warning,
      },
    }),
  },
  Button: stubs.button,
  Empty: stubs.empty,
  Input: stubs.input,
  Modal: stubs.modal,
  Pagination: stubs.pagination,
  Select: stubs.select,
  Spin: stubs.spin,
}));

vi.mock('@/api/files', () => ({
  apiFileResourcePage: mocks.allPage,
  apiMyFileResourcePage: mocks.minePage,
  apiUploadFile: mocks.upload,
}));

const resource: FileResource = {
  id: 7,
  key: '2026/09/02/avatar.png',
  url: '/uploads/2026/09/02/avatar.png',
  originalName: '头像.png',
  mimeType: 'image/png',
  extension: 'png',
  category: 'image',
  size: 1024,
  storage: 'local',
  uploaderId: 2,
  uploaderUsername: 'admin',
  referenceCount: 0,
  createdAt: '2026-09-02T12:00:00.000Z',
};

const result: PaginatedResult<FileResource> = {
  list: [resource],
  page: 1,
  pageSize: 15,
  total: 1,
};

const Picker = FileResourcePicker as unknown as DefineComponent<{
  open: boolean;
  scope?: 'mine' | 'all';
  categories?: readonly ['image'];
}>;

describe('FileResourcePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.minePage.mockResolvedValue(result);
    mocks.allPage.mockResolvedValue(result);
  });

  it('默认加载当前用户的图片资源并返回所选记录', async () => {
    const wrapper = mount(Picker, {
      props: { open: true, categories: ['image'] },
    });
    await flushPromises();

    expect(mocks.minePage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 15,
      keyword: '',
      category: 'image',
      storage: '',
    });

    await wrapper.get('[aria-label="选择头像.png"]').trigger('click');
    await wrapper.get('[data-testid="modal-ok"]').trigger('click');

    expect(wrapper.emitted('confirm')).toEqual([[[resource]]]);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('只有 all 模式调用全量资源接口', async () => {
    mount(Picker, {
      props: { open: true, scope: 'all', categories: ['image'] },
    });
    await flushPromises();

    expect(mocks.allPage).toHaveBeenCalledOnce();
    expect(mocks.minePage).not.toHaveBeenCalled();
  });
});
