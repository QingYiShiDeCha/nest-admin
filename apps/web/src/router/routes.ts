import type { RouteRecordRaw } from 'vue-router';
import { PERMISSIONS } from '@nest-admin/shared';

/**
 * 路由的额外信息。声明式地写在这里，守卫统一消费。
 * public: 无需登录（登录页、错误页）
 * permission: 进入该页所需的权限码，缺省表示只要登录即可
 */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    public?: boolean;
    permission?: string;
    /** 侧边栏图标，antdv 图标名 */
    icon?: string;
  }
}

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
        meta: { title: '首页', icon: 'DashboardOutlined' },
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
        meta: { title: '用户管理', permission: PERMISSIONS.USER_LIST },
      },
      {
        path: 'system/role',
        name: 'system-role',
        component: () => import('@/views/system/role/index.vue'),
        meta: { title: '角色管理', permission: PERMISSIONS.ROLE_LIST },
      },
      {
        path: 'system/menu',
        name: 'system-menu',
        component: () => import('@/views/system/menu/index.vue'),
        meta: { title: '菜单管理', permission: PERMISSIONS.MENU_LIST },
      },
      {
        path: 'system/log',
        name: 'system-log',
        component: () => import('@/views/system/log/index.vue'),
        meta: { title: '操作日志', permission: PERMISSIONS.LOG_LIST },
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
