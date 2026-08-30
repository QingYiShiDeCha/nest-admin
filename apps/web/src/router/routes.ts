import type { RouteRecordRaw } from 'vue-router';
import { ADMIN_ROUTE_NAME } from './dynamic-routes';

/** 管理页面由菜单树动态注册；消息中心是所有登录用户的个人收件箱。 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    name: ADMIN_ROUTE_NAME,
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: '/messages',
        name: 'message-center',
        component: () => import('@/views/messages/index.vue'),
        meta: {
          title: '消息中心',
          icon: 'RiNotification3Line',
          keepAlive: true,
          cacheName: 'MessageCenterPage',
        },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权访问', public: true },
  },
  {
    // 不标记 public：登录后要先加载菜单并注册动态路由，再决定是否真是 404
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在' },
  },
];
