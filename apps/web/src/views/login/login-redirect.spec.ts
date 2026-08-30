import { describe, expect, it } from 'vitest';

import { resolveLoginRedirect } from './login-redirect';

describe('resolveLoginRedirect', () => {
  it('保留站内重定向地址', () => {
    expect(resolveLoginRedirect('/system/user?page=2')).toBe(
      '/system/user?page=2',
    );
  });

  it('拒绝外部、协议相对和登录页循环跳转', () => {
    expect(resolveLoginRedirect('https://example.com')).toBe('/');
    expect(resolveLoginRedirect('//example.com')).toBe('/');
    expect(resolveLoginRedirect('/login?redirect=/dashboard')).toBe('/');
    expect(resolveLoginRedirect(['/dashboard'])).toBe('/');
  });
});
