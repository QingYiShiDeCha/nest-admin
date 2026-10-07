import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';

import type { MenuNode } from '@nest-admin/shared';
import CommandPalette from '@/layouts/components/command-palette/index.vue';
import { useMenuStore } from '@/stores/menu';
import { useRecentVisitsStore } from '@/stores/recent-visits';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('antdv-next', () => ({
  Modal: {
    name: 'AModal',
    props: { open: Boolean },
    emits: ['update:open'],
    // 关闭时不渲染内容，与真实 modal 的惰性挂载一致
    template: '<div v-if="open" class="modal-stub"><slot /></div>',
  },
  Input: {
    name: 'AInput',
    props: { value: String },
    emits: ['update:value'],
    // 不声明 keydown emit：让组件上的 @keydown.down/.enter 透传到真实 input 上
    template:
      '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
    methods: {
      focus(): void {},
    },
  },
  Empty: {
    name: 'AEmpty',
    props: { description: String },
    template: '<div>{{ description }}</div>',
  },
}));

function createNode(
  id: number,
  name: string,
  path: string,
  type: MenuNode['type'] = 'menu',
): MenuNode {
  return {
    id,
    parentId: null,
    name,
    type,
    path,
    component: type === 'menu' ? 'system/example/index' : null,
    icon: 'RiApps2Line',
    sort: id,
    visible: true,
    keepAlive: false,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    children: [],
  };
}

function createWrapper() {
  const pinia = createPinia();

  setActivePinia(pinia);

  return mount(CommandPalette, { global: { plugins: [pinia] } });
}

describe('CommandPalette', () => {
  it('Ctrl+K 打开面板，再按一次关闭', async () => {
    const wrapper = createWrapper();

    expect(wrapper.find('.modal-stub').exists()).toBe(false);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }),
    );
    await nextTick();

    expect(wrapper.find('.modal-stub').exists()).toBe(true);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
    );
    await nextTick();

    expect(wrapper.find('.modal-stub').exists()).toBe(false);
  });

  it('按关键词过滤，回车跳转当前高亮项', async () => {
    const pinia = createPinia();

    setActivePinia(pinia);
    useMenuStore(pinia).tree = [
      createNode(1, '用户管理', '/system/user'),
      createNode(2, '角色管理', '/system/role'),
    ];

    const wrapper = mount(CommandPalette, { global: { plugins: [pinia] } });

    wrapper.find('button[title="搜索页面"]').trigger('click');
    await nextTick();

    const search = wrapper.get('input');

    search.setValue('角色');
    await nextTick();

    const items = wrapper.findAll('.command-palette-item');

    expect(items).toHaveLength(1);
    expect(items[0]?.text()).toContain('角色管理');

    search.trigger('keydown', { key: 'Enter' });
    await nextTick();

    expect(mocks.push).toHaveBeenCalledWith('/system/role');
  });

  it('空关键词时展示最近访问分组', async () => {
    const pinia = createPinia();

    setActivePinia(pinia);
    useMenuStore(pinia).tree = [
      createNode(1, '用户管理', '/system/user'),
      createNode(2, '角色管理', '/system/role'),
    ];
    useRecentVisitsStore(pinia).record('/system/role', '角色管理');

    const wrapper = mount(CommandPalette, { global: { plugins: [pinia] } });

    wrapper.find('button[title="搜索页面"]').trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('最近访问');
    // 只渲染最近的那一条，而不是整棵菜单
    expect(wrapper.findAll('.command-palette-item')).toHaveLength(1);
  });

  it('后台撤掉权限后，持久化的最近访问条目不再出现', async () => {
    const pinia = createPinia();

    setActivePinia(pinia);
    // 菜单里已经没有「部门管理」，但 localStorage 恢复出来的记录里还有
    useMenuStore(pinia).tree = [createNode(1, '用户管理', '/system/user')];
    useRecentVisitsStore(pinia).visits = [
      { path: '/system/department', title: '部门管理' },
      { path: '/system/user', title: '用户管理' },
    ];

    const wrapper = mount(CommandPalette, { global: { plugins: [pinia] } });

    wrapper.find('button[title="搜索页面"]').trigger('click');
    await nextTick();

    const texts = wrapper
      .findAll('.command-palette-item')
      .map((item) => item.text());

    expect(texts.some((text) => text.includes('部门管理'))).toBe(false);
    expect(texts.some((text) => text.includes('用户管理'))).toBe(true);
  });

  it('外链条目走 window.open 而不是路由跳转', async () => {
    const openWindow = vi.fn();

    // mocks.push 是本文件共享的，前一条用例已经调过，不清就会误判
    mocks.push.mockClear();
    vi.stubGlobal('open', openWindow);

    const pinia = createPinia();

    setActivePinia(pinia);
    useMenuStore(pinia).tree = [
      createNode(9, '接口文档', 'http://localhost:3000/api/docs', 'external'),
    ];

    const wrapper = mount(CommandPalette, { global: { plugins: [pinia] } });

    wrapper.find('button[title="搜索页面"]').trigger('click');
    await nextTick();

    wrapper.get('.command-palette-item').trigger('click');
    await nextTick();

    expect(openWindow).toHaveBeenCalledWith(
      'http://localhost:3000/api/docs',
      '_blank',
      'noopener',
    );
    expect(mocks.push).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('触发点是不接受输入的假搜索框，并展示 Ctrl K 提示', async () => {
    const wrapper = createWrapper();
    const trigger = wrapper.get('button[title="搜索页面"]');

    expect(trigger.text()).toContain('搜索');
    // 快捷键提示常驻，不必点开面板就能看见
    expect(trigger.text()).toContain('Ctrl');
    expect(trigger.text()).toContain('K');
    // 它是个按钮而不是可输入元素——点击只是唤起面板
    expect(trigger.element.tagName).toBe('BUTTON');
    expect(trigger.find('input').exists()).toBe(false);
  });
});
