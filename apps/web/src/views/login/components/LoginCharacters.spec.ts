import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginCharacters from './LoginCharacters.vue';

describe('LoginCharacters', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('渲染四个原创模块角色', () => {
    const wrapper = mount(LoginCharacters);

    expect(wrapper.findAll('.absolute.bottom-0')).toHaveLength(4);
  });

  it('根据错误和密码显隐状态切换表情', async () => {
    const wrapper = mount(LoginCharacters, {
      props: { status: 'error' },
    });

    expect(wrapper.findAll('.border-t-2')).toHaveLength(4);

    await wrapper.setProps({ status: 'idle', passwordVisible: true });

    expect(wrapper.findAll('.h-1.w-6')).toHaveLength(3);
    expect(wrapper.findAll('.rounded-b-full')).toHaveLength(1);
  });
});
