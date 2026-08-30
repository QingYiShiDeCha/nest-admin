import type { RouteRecordRaw } from 'vue-router';
import { ADMIN_ROUTE_NAME } from './dynamic-routes';

/** 这里只保留应用外壳和公共页面，业务页面由当前用户的菜单树动态注册。 */
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
    children: [],
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
