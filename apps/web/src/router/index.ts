import { createRouter, createWebHistory } from 'vue-router';

import { setupGuards } from './guards';
import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

setupGuards(router);

export default router;
