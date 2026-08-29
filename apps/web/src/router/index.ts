import { useTabsStore } from '@/stores/tabs';
import { createRouter, createWebHistory } from 'vue-router';

import { setupGuards } from './guards';
import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

setupGuards(router);

// 页签跟随路由：进入的非公开页面自动成为页签（公开页在 visit 里被跳过）
router.afterEach((to) => {
  useTabsStore().visit(to);
});

export default router;
