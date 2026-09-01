import 'virtual:uno.css';

import './assets/main.css';

import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import App from './App.vue';
import router from './router';
import { vPermission } from './directives/permission';
import { resetDynamicRoutes } from './router/dynamic-routes';
import { useAuthStore } from './stores/auth';
import { useMenuStore } from './stores/menu';
import { useNotificationsStore } from './stores/notifications';
import { useSystemConfigStore } from './stores/system-config';
import { useTabsStore } from './stores/tabs';
import { onUnauthorized } from './utils/auth-events';
import { configureDayjsLocale } from './utils/dayjs-locale';

configureDayjsLocale();

const app = createApp(App);
const pinia = createPinia();

// 持久化默认走 localStorage，各 store 用 persist 选项声明要存什么。
// 刻意不全量持久化：服务端权限数据缓存下来会导致「后台刚撤的权限前端还生效」
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
const systemConfig = useSystemConfigStore(pinia);
const systemConfigReady = systemConfig.load().catch((error: unknown) => {
  console.error('运行时系统参数加载失败，将使用默认配置', error);
});
app.use(router);

watch(
  () => systemConfig.systemName,
  (systemName) => {
    const pageTitle = router.currentRoute.value.meta.title;
    if (pageTitle) document.title = `${pageTitle} · ${systemName}`;
  },
);

// 指令内部会 useAuthStore()，所以必须在 app.use(pinia) 之后注册
app.directive('permission', vPermission);

// http 层救不回登录态时会发这个事件。放在这里订阅而不是让 http 直接
// import router，避免一个纯请求模块反向依赖路由
onUnauthorized(() => {
  const redirect = router.currentRoute.value.fullPath;

  useAuthStore(pinia).reset();
  useMenuStore(pinia).reset();
  useNotificationsStore(pinia).reset();
  useTabsStore(pinia).reset();
  resetDynamicRoutes();

  if (router.currentRoute.value.name !== 'login') {
    void router.push({
      name: 'login',
      query: { redirect },
    });
  }
});

async function bootstrap(): Promise<void> {
  try {
    // 首次导航包含 profile、菜单、动态路由和懒加载页面解析。
    // 等它完成后再挂载，期间保留 index.html 中的启动加载页。
    await Promise.all([systemConfigReady, router.isReady()]);
  } catch (error) {
    console.error('路由初始化失败', error);
  }

  app.mount('#app');
}

void bootstrap();
