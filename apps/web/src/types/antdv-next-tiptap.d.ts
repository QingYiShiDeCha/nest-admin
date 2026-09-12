declare module 'antdv-next-tiptap' {
  import type { DefineComponent, Plugin } from 'vue';

  export interface TiptapProps {
    content?: string;
    placeholder?: string;
    height?: number | string;
    extensions?: any[];
  }

  /** 同时满足组件用法与 app.use() 插件用法 */
  const AntdvNextTiptap: DefineComponent<TiptapProps> & Plugin;
  export default AntdvNextTiptap;
}