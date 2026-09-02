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

  it('聚焦用户名时四个角色错落上探', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    const wrapper = mount(LoginCharacters, {
      props: { activeField: 'username' },
    });
    await wrapper.vm.$nextTick();

    const transforms = wrapper
      .findAll('.absolute.bottom-0')
      .map((character) => character.attributes('style'));

    expect(transforms[0]).toContain('translate3d(0px, -18px, 0)');
    expect(transforms[1]).toContain('translate3d(0px, -11px, 0)');
    expect(transforms[2]).toContain('translate3d(0px, -15px, 0)');
    expect(transforms[3]).toContain('translate3d(0px, -9px, 0)');
  });
});
