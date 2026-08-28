import { defineConfig, presetWind4, presetIcons } from 'unocss';
import { presetAntdTailwind4 } from '@antdv-next/unocss';

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons(),
    presetAntdTailwind4({
      prefix: 'a', // class 前缀，默认 'a'
      allowPrefixedUtilities: true, // 保留 a-* 工具类，默认 true
      allowUnprefixed: true, // 保留 bg-primary 这类旧裸类，默认 true
      antPrefix: 'ant', // CSS 变量前缀，默认 'ant'
      tokenPrefix: 'ant', // namespace 安全前缀，默认 'ant'，置空可关闭
    }),
  ],
});
