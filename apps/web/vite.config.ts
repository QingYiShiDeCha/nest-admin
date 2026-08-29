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
    /**
     * 让 @nest-admin/* 解析到各包的 TS 源码而不是 dist。
     *
     * 那些包的产物是 CommonJS（后端在用），浏览器按 ESM 导入拿不到具名导出，
     * 表现是 "does not provide an export named 'PERMISSIONS'" 且应用直接白屏。
     * 这个自定义条件在各包的 exports 里已经声明过（后端 typecheck 也用它），
     * 这里复用即可，不必为前端再产一份 ESM 产物。
     * 附带好处：改 shared 的代码前端能直接热更新，不需要先 build。
     */
    conditions: ['@nest-admin/source', 'module', 'browser', 'development|production'],
  },
  optimizeDeps: {
    // 走源码解析后它就是普通 TS 文件，不该被当成预构建依赖
    exclude: ['@nest-admin/shared'],
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
