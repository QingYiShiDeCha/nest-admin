import type { DictionaryTone } from '../constants/dictionary';
import type { Status } from '../constants/status';

export interface DictionaryType {
  id: number;
  name: string;
  code: string;
  status: Status;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DictionaryItem {
  id: number;
  typeId: number;
  label: string;
  value: string;
  tone: DictionaryTone | null;
  sort: number;
  status: Status;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 业务表单消费的数据结构，不暴露管理端审计字段。 */
export interface DictionaryOption {
  label: string;
  value: string;
  tone: DictionaryTone | null;
}
