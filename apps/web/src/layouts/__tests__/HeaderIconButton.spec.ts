import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import HeaderIconButton from '@/layouts/components/header-icon-button/index.vue';

describe('HeaderIconButton', () => {
  it('只负责统一按钮样式、无障碍名称和点击透传', async () => {
    const onClick = vi.fn();
    const wrapper = mount(HeaderIconButton, {
      props: { title: '刷新' },
      attrs: {
        class: 'header-refresh-trigger',
        onClick,
      },
      slots: { default: '<span data-testid="content">内容</span>' },
    });
    const button = wrapper.get('button');

    expect(button.attributes('title')).toBe('刷新');
    expect(button.attributes('aria-label')).toBe('刷新');
    expect(button.classes()).toEqual(
      expect.arrayContaining([
        'header-refresh-trigger',
        'w-9',
        'h-9',
        'text-xl',
      ]),
    );
    expect(button.get('[data-testid="content"]').text()).toBe('内容');

    await button.trigger('click');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('允许功能组件覆盖更具体的无障碍名称', () => {
    const wrapper = mount(HeaderIconButton, {
      props: { title: '消息通知', ariaLabel: '打开消息通知' },
    });

    expect(wrapper.get('button').attributes('aria-label')).toBe(
      '打开消息通知',
    );
  });
});
