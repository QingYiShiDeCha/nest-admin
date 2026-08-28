import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * 从起点逐级向上找到含 pnpm-workspace.yaml 的目录，即 monorepo 根。
 * 各包运行时的 cwd 不一致（pnpm --filter 会把 cwd 设到包目录），
 * 靠这个来定位仓库根的 .env，而不是写死相对层级。
 */
export function findWorkspaceRoot(start: string = process.cwd()): string {
  let dir = resolve(start);

  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }

    const parent = dirname(dir);

    if (parent === dir) {
      throw new Error(`未能从 ${start} 向上找到 pnpm-workspace.yaml`);
    }

    dir = parent;
  }
}

/** 仓库根的环境变量文件候选，.env.local 优先级更高 */
export function workspaceEnvFiles(start?: string): string[] {
  const root = findWorkspaceRoot(start);

  return [resolve(root, '.env.local'), resolve(root, '.env')];
}
