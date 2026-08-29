#!/usr/bin/node
/**
 * 样式约束检查：.vue 文件禁止 <style> 块，样式一律用 UnoCSS 工具类。
 *
 * 「非必要不用原生 CSS」——工具类让样式与模板同处、无命名负担、天然
 * 随主题变量联动。确需原生 CSS 的场景（复杂兄弟/伪元素选择器、
 * @media、伪类链）在下方 ALLOWLIST 登记并写明理由，登记即承诺：
 * 没有它表达不了或可读性明显更差。
 *
 * 用法：node scripts/no-native-css.mjs（已接入 pnpm lint）
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1');

/** 允许保留 <style> 的文件（相对 src/ 的路径）→ 为什么原生 CSS 是必要的 */
const ALLOWLIST = new Map([
  [
    'views/dashboard/index.vue',
    '图表占位样式：.donut-stats > div + div 这类兄弟选择器、@media 响应式网格重排，' +
      '用任意变体写成一长串 class 可读性远差于十行 scoped CSS',
  ],
]);

/** 递归收集 .vue 文件 */
function walk(dir) {
  const files = [];

  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (name.endsWith('.vue')) {
      files.push(full);
    }
  }

  return files;
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join('/');

  if (ALLOWLIST.has(rel)) {
    continue;
  }

  if (/<style\b/.test(readFileSync(file, 'utf8'))) {
    violations.push(rel);
  }
}

if (violations.length > 0) {
  console.error('以下文件包含 <style> 块，样式请改用 UnoCSS 工具类：');
  for (const file of violations) {
    console.error(`  - ${file}`);
  }
  console.error(
    '\n确需原生 CSS（复杂选择器/@media 等）时，在 scripts/no-native-css.mjs 的' +
      ' ALLOWLIST 登记并写明理由。',
  );
  process.exit(1);
}

console.log(`样式检查通过：src 下 .vue 文件无未登记的 <style> 块（白名单 ${ALLOWLIST.size} 个）。`);
