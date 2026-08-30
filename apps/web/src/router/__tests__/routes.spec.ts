import { describe, expect, it } from 'vitest';

import { ADMIN_ROUTE_NAME } from '@/router/dynamic-routes';
import { routes } from '@/router/routes';

describe('fixed routes', () => {
  it('把个人消息中心注册为所有登录用户可访问的固定路由', () => {
    const adminRoute = routes.find((route) => route.name === ADMIN_ROUTE_NAME);
    const messageRoute = adminRoute?.children?.find(
      (route) => route.path === '/messages',
    );

    expect(messageRoute).toMatchObject({
      name: 'message-center',
      meta: { title: '消息中心', cacheName: 'MessageCenterPage' },
    });
  });
});
