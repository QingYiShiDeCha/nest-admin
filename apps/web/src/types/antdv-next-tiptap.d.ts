declare module 'antdv-next-tiptap' {
  import type { DefineComponent, Plugin } from 'vue';

  export interface TiptapProps {
    content?: string;
    placeholder?: string;
    height?: number | string;
    // 页面侧暂未传入自定义扩展；声明为 unknown[] 而不是 any[]，
    // 避免放宽整个联合类型的类型检查
    extensions?: unknown[];
  }

  /** 同时满足组件用法与 app.use() 插件用法 */
  const AntdvNextTiptap: DefineComponent<TiptapProps> & Plugin;
  export default AntdvNextTiptap;
}