<template>
  <div class="p-6">
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

      <div class="mb-6">
        <AEditor
          v-model="content"
          placeholder="请输入内容..."
          :height="600"
          @change="handleUpdate"
        />
      </div>

      <a-divider />

      <div class="mt-6">
        <h3 class="text-lg font-semibold mb-4">内容预览（HTML）</h3>
        <a-card :bordered="false" class="bg-fill-quaternary">
          <div v-if="content" v-html="content" class="rich-content"></div>
          <a-empty v-else description="暂无内容" />
        </a-card>
      </div>

      <a-divider />

      <div class="mt-6">
        <h3 class="text-lg font-semibold mb-4">原始 HTML</h3>
        <a-card :bordered="false" class="bg-fill-quaternary">
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