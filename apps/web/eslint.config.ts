import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import pluginVue from 'eslint-plugin-vue';

// 前端独立的 ESLint 配置，与仓库根那份（面向 Node/NestJS）互不相干：
// 根配置 ignore 了 apps/web，这里也不碰后端文件。
// 事实标准是 create-vue 官方模板的组合：vue 插件负责模板规则，
// vueTsConfigs 提供 .vue 内 TS 的类型感知检查，最后关掉所有格式规则，
// 格式交给 prettier 单独处理。
export default defineConfigWithVueTs(
  {
    name: 'web/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'web/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,
);
