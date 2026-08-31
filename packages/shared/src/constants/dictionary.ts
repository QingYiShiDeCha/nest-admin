/** 字典项可选的语义色，与前端 AppTag 的主题色能力对应。 */
export const DICTIONARY_TONE = [
  'default',
  'primary',
  'success',
  'warning',
  'error',
  'info',
] as const;

export type DictionaryTone = (typeof DICTIONARY_TONE)[number];
