import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AppTag from '@/components/core/base/app-tag/index.vue';

const designToken = vi.hoisted(() => ({
  colorPrimary: '#5D87FF',
  colorPrimaryBg: '#EEF3FF',
  colorPrimaryBorder: '#B8CAFF',
  colorSuccess: '#13DEB9',
  colorSuccessBg: '#E8FCF8',
  colorSuccessBorder: '#8CEEDC',
  colorWarning: '#FFAE1F',
  colorWarningBg: '#FFF7E8',
  colorWarningBorder: '#FFD98F',
  colorError: '#FF4D4F',
  colorErrorBg: '#FFF1F0',
  colorErrorBorder: '#FFCCC7',
  colorInfo: '#38C0FC',
  colorInfoBg: '#E9F9FF',
  colorInfoBorder: '#9BE2FF',
  colorTextSecondary: '#4D5875',
  colorFillTertiary: '#F2F4F5',
  colorBorderSecondary: '#E2E8EE',
}));

vi.mock('antdv-next', () => ({
  Tag: {
    name: 'ATag',
    inheritAttrs: false,
    template: '<span data-testid="tag" v-bind="$attrs"><slot /></span>',
  },
  theme: {
    useToken: () => ({ token: { value: designToken } }),
  },
}));

describe('AppTag', () => {
  it('主色标签使用项目派生 token', () => {
    const wrapper = mount(AppTag, {
      props: { tone: 'primary' },
      slots: { default: '目录' },
    });

    const style = wrapper.get('[data-testid="tag"]').attributes('style');
    expect(style).toContain('color: rgb(93, 135, 255)');
    expect(style).toContain('background-color: rgb(238, 243, 255)');
    expect(style).toContain('border-color: rgb(184, 202, 255)');
  });

  it('成功标签使用项目语义色 token', () => {
    const wrapper = mount(AppTag, {
      props: { tone: 'success' },
      slots: { default: '启用' },
    });

    const style = wrapper.get('[data-testid="tag"]').attributes('style');
    expect(style).toContain('color: rgb(19, 222, 185)');
    expect(style).toContain('background-color: rgb(232, 252, 248)');
  });
});
