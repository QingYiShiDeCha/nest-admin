declare module 'antdv-next-tiptap' {
  import type { DefineComponent } from 'vue';

  export interface TiptapProps {
    content?: string;
    placeholder?: string;
    height?: number | string;
    extensions?: any[];
  }

  const AntdvNextTiptap: DefineComponent<TiptapProps>;
  export default AntdvNextTiptap;
}
