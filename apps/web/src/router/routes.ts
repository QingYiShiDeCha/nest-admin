import type { RouteRecordRaw } from 'vue-router';
import { PERMISSIONS } from '@nest-admin/shared';

/**
 * 静态路由表。刻意不用后端菜单动态注册：
 * 写在代码里能被 vue-tsc 检查、组件路径写错在构建期就暴露，
 * 而 DB 里配错一个 component 是运行时白屏且毫无提示。
 * 后端菜单的作用是渲染侧边栏与决定可达性，不负责注册。
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '首页',
          icon: 'RiDashboardLine',
          affix: true,
          keepAlive: true,
          cacheName: 'DashboardPage',
        },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: 'system/user',
        name: 'system-user',
        component: () => import('@/views/system/user/index.vue'),
        meta: {
          title: '用户管理',
          permission: PERMISSIONS.USER_LIST,
          keepAlive: true,
          cacheName: 'UserPage',
        },
      },
      {
        path: 'system/role',
        name: 'system-role',
        component: () => import('@/views/system/role/index.vue'),
        meta: {
          title: '角色管理',
          permission: PERMISSIONS.ROLE_LIST,
          keepAlive: true,
          cacheName: 'RolePage',
        },
      },
      {
        path: 'system/menu',
        name: 'system-menu',
        component: () => import('@/views/system/menu/index.vue'),
        meta: {
          title: '菜单管理',
          permission: PERMISSIONS.MENU_LIST,
          keepAlive: true,
          cacheName: 'MenuPage',
        },
      },
      {
        path: 'system/log',
        name: 'system-log',
        component: () => import('@/views/system/log/index.vue'),
        meta: {
          title: '操作日志',
          permission: PERMISSIONS.LOG_LIST,
          keepAlive: true,
          cacheName: 'LogPage',
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
    // 放在最后：它会吃掉所有未匹配的路径
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', public: true },
  },
];
