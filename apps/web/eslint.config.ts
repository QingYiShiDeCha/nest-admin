import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import pluginVue from 'eslint-plugin-vue';

// 允许 .vue 里出现 <script setup lang="tsx">。
// 默认只认 lang="ts"，不声明的话 vue-eslint-parser 会在 JSX 上直接报
// '>' expected，而 vue-tsc 却能正常通过——两边配置不同步最容易踩。
// 本项目用的是 recommended（非 type-aware）规则集，官方提示的
// 「tsx 与 type-aware 规则冲突」在此不适用；将来若切到
// recommendedTypeChecked，需要重新评估这个开关。
configureVueProject({
  scriptLangs: ['ts', 'tsx'],
});

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
  {
    name: 'web/rules',
    rules: {
      // 页面组件统一叫 views/<域>/index.vue，路由 path 与目录路径一一对应，
      // 看 URL 就知道找哪个文件。这个约定下文件名必然单词单一，规则不适用。
      // 可复用组件仍应用多词命名（放在 components/ 下，不受此影响）。
      'vue/multi-word-component-names': 'off',
      // SFC 只允许单根节点：多根组件无法透传 attrs/插槽定位，
      // 也让父容器的 flex 高度链断在多余的兄弟节点上
      'vue/no-multiple-template-root': 'error',
    },
  },
);
