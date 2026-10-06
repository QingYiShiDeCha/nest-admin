# 富文本编辑器集成文档

> 最后核对：2026-10-01（对照提交 `84aa65d`）

组件：[`antdv-next-tiptap`](https://github.com/pengyinghao/antdv-next-tiptap) v1.0.5（基于 Tiptap 3.26），
只用于 `views/editor` 这个示例页。**通知公告等业务表单目前仍用 `a-textarea`**，见文末「已知边界」。

## 接入现状

### 依赖与全局注册

`apps/web/src/main.ts`：

```ts
import 'antdv-next-tiptap/index.css'; // 组件样式（包内 dist/index.css）
import './assets/editor-content.css'; // 渲染态样式，见下
import AntdvNextTiptap from 'antdv-next-tiptap';
import './assets/main.css';

app.use(AntdvNextTiptap); // 全局注册，注册名 AEditor
```

包的 `exports` 只暴露 `.` 与 `./index.css` 两个入口，没有 `dist/style.css` 这个路径。

### 渲染态样式

`apps/web/src/assets/editor-content.css` 提供 `.rich-content`，用于把 `v-html` 注入的富文本 HTML
渲染成与 antd 主题一致的排版（正文色 `--ant-color-text`、行高 1.6、长串断行）。

编辑器自身只需要 `index.css` 里的 `.editor-content .tiptap` 规则。两者缺一不可：
前者管编辑态，后者管展示态（公告详情、预览区等只读场景）。

样式全部走 `var(--ant-color-*)` 而非写死颜色，因此换 ConfigProvider 主题（浅色/深色/自定义色）
时渲染态会跟着变。

> `.vue` 禁止 `<style>` 块（`apps/web/scripts/no-native-css.mjs` 在 lint 里强制）。
> 这个文件是独立 CSS 资源而非 SFC 样式块，所以不在该检查范围内。
> 新增渲染态样式时同样优先写在这里，不要为了图方便在 SFC 里开 `<style>`。

### 路由

`apps/web/src/router/routes.ts` 的**静态路由**：

```ts
{
  path: '/editor',
  name: 'editor-demo',
  component: () => import('@/views/editor/index.vue'),
  meta: {
    title: '富文本编辑器',
    icon: 'RiEditLine',
    keepAlive: true,
    cacheName: 'EditorDemoPage',
  },
}
```

### 菜单

菜单由 `packages/database/scripts/seed.ts` 播种，**不要手写 SQL 插菜单**：

```ts
{
  // 页面组件由前端静态路由注册（routes.ts 的 /editor），
  // 菜单这里只登记 path 不登记组件，避免与前端动态路由冲突
  name: '富文本编辑器',
  type: 'menu',
  path: '/editor',
  icon: 'RiEditLine',
  sort: 40,
  keepAlive: true,
}
```

`icon` 存的是**字符串**不是 class。字符串到 class 的映射在
`apps/web/src/layouts/menu-icons.ts`：`RiEditLine` → `i-ri:edit-line`。
该文件同时生成 `uno.config.ts` 的 safelist——运行时拼出来的图标 class 不进 safelist 就不生成 CSS。

菜单是「当前版本应当长什么样」，属于 seed 而不是迁移。

## 访问方式

- 直接访问：http://localhost:5273/editor
- 侧边栏：菜单播种后由 `db:seed` 生成，需要角色被授予该菜单
- **权限**：无独立权限码，所有登录用户可见

## 用法

```vue
<template>
  <AEditor v-model="content" placeholder="请输入内容..." :height="600" @change="onChange" />
</template>

<script setup lang="ts">
import { ref } from 'vue';

const content = ref('');
const onChange = (html: string) => console.log(html.length);
</script>
```

绑的是 `v-model`（默认 `modelValue`），不是 `v-model:content`。

### Props（来自包的 `EditorProps`）

| Prop | 说明 |
| --- | --- |
| `height` | 内容区高度 |
| `editable` | 是否可编辑 |
| `disabledPlugins` | 禁用的插件名列表，如 `['image', 'video', 'table']` |
| `uploadImage` | `(file, onProgress) => Promise<string>`，返回图片 URL；**不传则 base64 内嵌** |
| `uploadVideo` | 同上；不传时只支持填视频地址，没有本地上传入口 |
| `wordCount` | `true` 显示计数，数字则同时限制上限 |
| `outputFormat` | `'html'`（默认，`modelValue` 为 HTML 字符串）或 `'json'`（Tiptap doc JSON 字符串） |
| `locale` | `'zh-CN'`（默认）/ `'en-US'` / 自定义消息对象 |

内置插件：撤销重做、标题、粗体、斜体、下划线、删除线、行内代码、代码块、引用、有序/无序/任务列表、
左中右对齐、分隔线、清除格式、文字色、高亮、链接、图片、图片上传、视频、视频上传、表格、
字体、字号、打印、全屏。

### 图片上传

示例页没传 `uploadImage`，所以插进去的图片是 base64 内联。要改成上传到资源中心：

```ts
import { apiUploadFile } from '@/api/files';

const uploadImage = async (file: File) => {
  const result = await apiUploadFile(file);
  return result.url;
};
```

```vue
<AEditor v-model="content" :upload-image="uploadImage" />
```

后端上传接口会做魔数嗅探校验内容类型，并登记 `sys_file_resource` 元数据；
被用户头像引用的资源不允许删除。

## 已知边界

1. **业务表单还没接编辑器**。`views/system/notice` 的正文仍是 `a-textarea`，写入的是纯文本/HTML 字符串，
   前端用 `v-html` 直接渲染。要改成富文本编辑需要先决定存量内容的兼容策略。
2. **类型声明是本地手写的**。`apps/web/src/types/antdv-next-tiptap.d.ts` 用
   `declare module 'antdv-next-tiptap'` 声明了一个 `TiptapProps`，会遮蔽包自带的
   `dist/types/index.d.ts`，且 props 名单过时（写的是 `content`，实际是 `modelValue`/`editable`/
   `uploadImage`/`wordCount`/`outputFormat`/`locale`）。目前没出问题是因为组件靠插件全局注册、
   没有直接 import，模板里的类型检查管不到它。清理清单见 [`计划.md`](../计划.md) 的「下一步候选」。
3. **示例页有 `alert()`**。`handleGetContent` 用 `alert()` 弹输出，示例性质，别照抄到业务代码。

## 排错

| 现象 | 检查 |
| --- | --- |
| 编辑区完全没样式 | `main.ts` 是否引了 `antdv-next-tiptap/index.css` |
| 展示区（`v-html`）排版是浏览器默认样式 | `editor-content.css` 是否引入、容器是否加了 `.rich-content` |
| 深色模式下正文看不清 | 渲染态颜色是否写死了值，应走 `var(--ant-color-*)` |
| 侧边栏没入口 | 跑过 `pnpm db:seed`；菜单 icon 字符串在 `menu-icons.ts` 里有映射 |
| 图标 class 生效但样式丢失 | 运行时拼出的 class 是否进了 `uno.config.ts` 的 safelist |
| 组件模板不认识 `AEditor` | `main.ts` 是否 `app.use(AntdvNextTiptap)` |