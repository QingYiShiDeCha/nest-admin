# 富文本编辑器集成文档

## 📦 已完成的工作

### 1. 安装依赖
```bash
pnpm add antdv-next-tiptap
```

### 2. 全局注册组件

**文件**: `apps/web/src/main.ts`

```typescript
import 'antdv-next-tiptap/dist/style.css'; // 引入样式
import AntdvNextTiptap from 'antdv-next-tiptap';

app.use(AntdvNextTiptap); // 全局注册
```

### 3. 创建示例页面

**文件**: `apps/web/src/views/editor/index.vue`

- ✅ 富文本编辑器组件
- ✅ 内容预览区域
- ✅ 原始 HTML 显示
- ✅ 示例内容加载
- ✅ 清空/获取内容功能

### 4. 配置路由

**文件**: `apps/web/src/router/routes.ts`

```typescript
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

### 5. TypeScript 类型声明

**文件**: `apps/web/src/types/antdv-next-tiptap.d.ts`

提供基础类型支持，避免 TypeScript 错误。

---

## 🎯 访问方式

### 直接访问
- URL: `http://localhost:5173/editor`
- **权限**: 所有登录用户可见（无需特殊权限）

### 侧边栏访问
由于这是静态路由（不是从后端菜单接口加载），你需要选择以下方式之一：

#### 方式1：添加到后端菜单（推荐）

在数据库中添加菜单记录：

```sql
INSERT INTO sys_menu (
  name, path, component, type, icon, sort, 
  visible, status, created_at, updated_at
) VALUES (
  '富文本编辑器',
  '/editor',
  'editor/index',
  'menu',
  'RiEditLine',
  100,
  1,
  'active',
  NOW(),
  NOW()
);
```

然后为角色分配这个菜单权限。

#### 方式2：添加到 Header 快捷入口

在 `apps/web/src/layouts/components/Header.vue` 中添加快捷访问按钮：

```vue
<a-button @click="$router.push('/editor')">
  <template #icon><RiEditLine /></template>
  富文本编辑器
</a-button>
```

---

## 🎨 编辑器功能

### 支持的格式
- ✅ **文本格式**: 粗体、斜体、下划线、删除线、代码
- ✅ **标题**: H1 - H6
- ✅ **列表**: 有序列表、无序列表
- ✅ **引用**: 块引用
- ✅ **代码块**: 支持语法高亮
- ✅ **表格**: 可调整大小
- ✅ **图片**: 插入图片
- ✅ **链接**: 超链接
- ✅ **文本对齐**: 左对齐、居中、右对齐
- ✅ **颜色**: 文本颜色、背景色
- ✅ **字体大小**: 可调整

### 工具栏功能
- 撤销/重做
- 清空格式
- 插入分隔线
- 全屏编辑

---

## 🔧 高级用法

### 自定义配置

如果需要自定义编辑器配置，可以在组件中这样使用：

```vue
<template>
  <AntdvNextTiptap
    v-model:content="content"
    :height="600"
    :placeholder="请输入内容..."
    :disabled="false"
    @update:content="handleUpdate"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

const content = ref('');

const handleUpdate = (newContent: string) => {
  console.log('内容更新:', newContent);
};
</script>
```

### 与后端集成

保存内容到服务器：

```typescript
import { apiCreateNotice } from '@/api/notices';

const handleSave = async () => {
  try {
    await apiCreateNotice({
      title: '标题',
      content: content.value, // HTML 内容
      type: 'announcement',
    });
    message.success('保存成功');
  } catch (error) {
    message.error('保存失败');
  }
};
```

### 图片上传

如果需要支持图片上传到服务器，可以配置：

```typescript
import { apiUploadFile } from '@/api/files';

const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const result = await apiUploadFile(formData);
  return result.url; // 返回图片 URL
};
```

---

## 📝 使用示例

### 示例1：创建通知公告

```vue
<template>
  <a-card title="发布公告">
    <a-form :model="form">
      <a-form-item label="标题">
        <a-input v-model:value="form.title" />
      </a-form-item>
      
      <a-form-item label="内容">
        <AntdvNextTiptap v-model:content="form.content" :height="400" />
      </a-form-item>
      
      <a-form-item>
        <a-button type="primary" @click="handleSubmit">发布</a-button>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const form = reactive({
  title: '',
  content: '',
});

const handleSubmit = () => {
  console.log('提交数据:', form);
  // 调用 API 保存
};
</script>
```

### 示例2：编辑已有内容

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiGetNotice } from '@/api/notices';

const content = ref('');

onMounted(async () => {
  const notice = await apiGetNotice(1);
  content.value = notice.content; // 加载已有的 HTML 内容
});
</script>
```

---

## 🐛 常见问题

### 1. 样式不生效

确保在 `main.ts` 中引入了样式：

```typescript
import 'antdv-next-tiptap/dist/style.css';
```

### 2. TypeScript 类型错误

确保存在类型声明文件：`apps/web/src/types/antdv-next-tiptap.d.ts`

### 3. 组件未注册

确保在 `main.ts` 中全局注册：

```typescript
import AntdvNextTiptap from 'antdv-next-tiptap';
app.use(AntdvNextTiptap);
```

### 4. 侧边栏看不到入口

- 检查是否在数据库中添加了菜单
- 检查角色是否有菜单权限
- 或者直接访问 `/editor` 路径

---

## 🚀 下一步优化

### 1. 图片上传到服务器
当前图片是 base64 内联，可以改为上传到文件服务器：

```typescript
// 配置图片上传
const imageUploadHandler = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiUploadFile(formData);
  return result.url;
};
```

### 2. 内容审核
如果需要内容审核，在保存前可以调用审核接口：

```typescript
const handleSave = async () => {
  // 1. 审核内容
  const auditResult = await apiAuditContent(content.value);
  
  if (!auditResult.passed) {
    message.error('内容包含敏感词，请修改');
    return;
  }
  
  // 2. 保存内容
  await apiSave(content.value);
};
```

### 3. 协同编辑
如果需要多人协同编辑，可以集成 Yjs：

```bash
pnpm add @tiptap/extension-collaboration
```

---

## 📚 参考资源

- [antdv-next-tiptap GitHub](https://github.com/pengyinghao/antdv-next-tiptap)
- [Tiptap 官方文档](https://tiptap.dev/)
- [Ant Design Vue](https://antdv.com/)

---

**完成时间**: 2026-01-09  
**版本**: v1.0
