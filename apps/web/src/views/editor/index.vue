<template>
  <div class="p-6 page-container">
    <a-card title="富文本编辑器示例" :bordered="false">
      <template #extra>
        <a-space>
          <a-button @click="handleClear">清空内容</a-button>
          <a-button type="primary" @click="handleGetContent">获取内容</a-button>
          <a-button type="primary" @click="handleSetContent">设置示例内容</a-button>
        </a-space>
      </template>

      <div class="mb-4">
        <a-alert
          message="提示"
          description="这是一个富文本编辑器示例页面，所有登录用户均可访问。支持文本格式化、插入图片、表格、代码块等功能。"
          type="info"
          show-icon
          closable
        />
      </div>

      <div class="editor-container">
        <AEditor
          v-model="content"
          placeholder="请输入内容..."
          :height="600"
          @change="handleUpdate"
        />
      </div>

      <a-divider />

      <div class="preview-section">
        <h3 class="text-lg font-semibold mb-4">内容预览（HTML）</h3>
        <a-card :bordered="false" class="bg-gray-50">
          <div v-if="content" v-html="content" class="prose max-w-none"></div>
          <a-empty v-else description="暂无内容" />
        </a-card>
      </div>

      <a-divider />

      <div class="raw-section">
        <h3 class="text-lg font-semibold mb-4">原始 HTML</h3>
        <a-card :bordered="false" class="bg-gray-50">
          <pre class="text-xs overflow-auto">{{ content || '暂无内容' }}</pre>
        </a-card>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const content = ref('');

// 处理内容更新
const handleUpdate = (newContent: string) => {
  console.log('内容已更新，长度:', newContent.length);
};

// 清空内容
const handleClear = () => {
  content.value = '';
};

// 获取内容
const handleGetContent = () => {
  if (!content.value) {
    console.warn('编辑器内容为空');
    return;
  }
  console.log('HTML 内容:', content.value);
  alert('内容已输出到控制台，请按 F12 查看');
};

// 设置示例内容
const handleSetContent = () => {
  content.value = `
    <h1>欢迎使用富文本编辑器</h1>
    <p>这是一个基于 <strong>Tiptap</strong> 的富文本编辑器示例。</p>

    <h2>支持的功能</h2>
    <ul>
      <li><strong>文本格式化</strong>：粗体、斜体、下划线、删除线</li>
      <li><strong>标题</strong>：H1 - H6 六级标题</li>
      <li><strong>列表</strong>：有序列表、无序列表</li>
      <li><strong>引用</strong>：块引用</li>
      <li><strong>代码</strong>：行内代码和代码块</li>
      <li><strong>表格</strong>：可调整大小的表格</li>
      <li><strong>图片</strong>：插入图片</li>
      <li><strong>链接</strong>：插入超链接</li>
    </ul>

    <h2>代码示例</h2>
    <pre><code>function hello() {
  console.log('Hello, World!');
}</code></pre>

    <h2>引用示例</h2>
    <blockquote>
      <p>这是一段引用文本，用于强调重要内容。</p>
    </blockquote>

    <h2>表格示例</h2>
    <table>
      <thead>
        <tr>
          <th>功能</th>
          <th>状态</th>
          <th>说明</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>文本编辑</td>
          <td>✅ 已完成</td>
          <td>支持富文本编辑</td>
        </tr>
        <tr>
          <td>图片上传</td>
          <td>✅ 已完成</td>
          <td>支持插入图片</td>
        </tr>
        <tr>
          <td>表格编辑</td>
          <td>✅ 已完成</td>
          <td>支持可调整表格</td>
        </tr>
      </tbody>
    </table>

    <p><em>感谢使用本系统！</em></p>
  `;
};
</script>

<style scoped>
.page-container {
  height: 100%;
  overflow-y: auto;
}

/* 自定义滚动条样式 - 无箭头按钮 */
.page-container::-webkit-scrollbar {
  width: 8px;
}

.page-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.page-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.page-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.editor-container {
  margin-bottom: 24px;
}

/* 隔离编辑器样式，防止全局样式影响 */
.editor-container :deep(.tiptap-editor),
.editor-container :deep(.ProseMirror) {
  color: initial;
  background: initial;
}

.preview-section,
.raw-section {
  margin-top: 24px;
}

/* 让预览内容更美观 */
:deep(.prose) {
  max-width: 100%;
  color: inherit;
  line-height: 1.6;
}

:deep(.prose h1) {
  font-size: 2em;
  font-weight: bold;
  margin-top: 0.67em;
  margin-bottom: 0.67em;
  line-height: 1.2;
}

:deep(.prose h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin-top: 0.83em;
  margin-bottom: 0.83em;
  line-height: 1.2;
}

:deep(.prose h3) {
  font-size: 1.17em;
  font-weight: bold;
  margin-top: 1em;
  margin-bottom: 1em;
}

:deep(.prose p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

:deep(.prose ul),
:deep(.prose ol) {
  margin-left: 2em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  padding-left: 0;
}

:deep(.prose li) {
  margin-bottom: 0.25em;
}

:deep(.prose blockquote) {
  border-left: 4px solid #d9d9d9;
  padding-left: 1em;
  margin: 1em 0;
  color: #666;
  font-style: italic;
}

:deep(.prose pre) {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  margin: 1em 0;
}

:deep(.prose code) {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Courier New', monospace;
}

:deep(.prose pre code) {
  background-color: transparent;
  padding: 0;
}

:deep(.prose table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

:deep(.prose table th),
:deep(.prose table td) {
  border: 1px solid #d9d9d9;
  padding: 0.5em;
  text-align: left;
}

:deep(.prose table th) {
  background-color: #fafafa;
  font-weight: bold;
}

:deep(.prose table tbody tr:hover) {
  background-color: #f5f5f5;
}

:deep(.prose strong) {
  font-weight: bold;
}

:deep(.prose em) {
  font-style: italic;
}

:deep(.prose a) {
  color: #1890ff;
  text-decoration: underline;
}

:deep(.prose a:hover) {
  color: #40a9ff;
}
</style>
