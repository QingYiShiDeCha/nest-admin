import { presetAntdTailwind4 } from '@antdv-next/unocss';
import { defineConfig, presetIcons, presetWind4 } from 'unocss';

import { MENU_ICONS } from './src/layouts/menu-icons';

export default defineConfig({
  content: {
    // .ts 默认不进入 UnoCSS 扫描管线；显式监听后，开发时新增菜单图标可立即 HMR。
    filesystem: ['src/layouts/menu-icons.ts'],
  },
  presets: [
    presetWind4(),
    presetIcons({
      // mask 模式下图标继承 currentColor（菜单/按钮换色自动跟随），
      // inline-block 让 <i class="i-ri:xxx" /> 与文字对齐
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
    presetAntdTailwind4({
      prefix: 'a', // class 前缀，默认 'a'
      allowPrefixedUtilities: true, // 保留 a-* 工具类，默认 true
      allowUnprefixed: true, // 保留 bg-primary 这类旧裸类，默认 true
      antPrefix: 'ant', // CSS 变量前缀，默认 'ant'
      tokenPrefix: 'ant', // namespace 安全前缀，默认 'ant'，置空可关闭
    }),
  ],
  /**
   * 菜单图标的 class 是运行时从数据库的 sys_menu.icon 拼出来的，
   * 扫描器在源码里看不到，必须 safelist 让它们始终生成。
   * 清单直接取自注册表，与菜单图标选择器同源。
   */
  safelist: Object.values(MENU_ICONS),
});
