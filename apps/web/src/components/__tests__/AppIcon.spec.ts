import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AppIcon from '@/components/core/base/app-icon/index.vue';

describe('AppIcon', () => {
  it('用 UnoCSS 图标类渲染图标并透传属性', () => {
    const wrapper = mount(AppIcon, {
      props: { icon: 'i-ri:user-3-line', alt: '用户' },
      attrs: { class: 'text-xl', 'data-testid': 'icon' },
    });

    expect(wrapper.element.tagName).toBe('I');
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['app-icon', 'i-ri:user-3-line', 'text-xl']),
    );
    expect(wrapper.attributes()).toMatchObject({
      'aria-label': '用户',
      'data-testid': 'icon',
      role: 'img',
    });
  });

  it('把没有文本说明的装饰图标设为 aria-hidden', () => {
    const wrapper = mount(AppIcon, { props: { icon: 'i-ri:close-line' } });

    expect(wrapper.attributes('aria-hidden')).toBe('true');
    expect(wrapper.attributes('aria-label')).toBeUndefined();
  });

  it('直接使用完整图片 URL', () => {
    const wrapper = mount(AppIcon, {
      props: { icon: 'https://example.com/icon.svg', alt: '外部图标' },
    });

    expect(wrapper.element.tagName).toBe('IMG');
    expect(wrapper.attributes('src')).toBe('https://example.com/icon.svg');
    expect(wrapper.attributes('alt')).toBe('外部图标');
  });

  it('给相对图片路径拼接 API 基础路径', () => {
    const wrapper = mount(AppIcon, {
      props: { icon: '/uploads/menu.svg?v=1' },
    });

    expect(wrapper.attributes('src')).toBe('/api/uploads/menu.svg?v=1');
  });
});
