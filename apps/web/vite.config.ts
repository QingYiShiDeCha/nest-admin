import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver';
// vite.config.ts
import Components from 'unplugin-vue-components/vite';
import Unocss from 'unocss/vite';

// 后端本地端口。dev 时把 /api 代理过去，前端代码里只需要写相对路径，
// 不必关心后端跑在哪个端口、也没有跨域问题
const API_PROXY_TARGET = 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    Unocss(),
    Components({
      resolvers: [AntdvNextResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
});
