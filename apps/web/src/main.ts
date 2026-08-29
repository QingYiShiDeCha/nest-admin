import 'virtual:uno.css';

import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import App from './App.vue';
import router from './router';
import { onUnauthorized } from './utils/auth-events';

const app = createApp(App);
const pinia = createPinia();

// 持久化默认走 localStorage，各 store 用 persist 选项声明要存什么。
// 刻意不全量持久化：服务端权限数据缓存下来会导致「后台刚撤的权限前端还生效」
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);

// http 层救不回登录态时会发这个事件。放在这里订阅而不是让 http 直接
// import router，避免一个纯请求模块反向依赖路由
onUnauthorized(() => {
  if (router.currentRoute.value.name !== 'login') {
    void router.push({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath },
    });
  }
});

app.mount('#app');
