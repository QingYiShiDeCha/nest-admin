// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// monorepo 只维护这一份 flat config，projectService 会为每个文件
// 自动匹配所在包的 tsconfig.json，因此新增包无需改动这里
export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      '**/dist/**',
      '**/coverage/**',
      '**/migrations/**',
      // 这份是面向 Node/NestJS 的类型感知配置，解析不了 .vue，
      // 也没有 eslint-plugin-vue。前端应当在 apps/web 下配自己的那套。
      'apps/web/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
