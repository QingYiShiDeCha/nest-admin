import type { Status } from '../constants/status';
import type { SystemConfigValueType } from '../constants/system-config';

export interface SystemConfig {
  id: number;
  name: string;
  key: string;
  value: string;
  valueType: SystemConfigValueType;
  status: Status;
  builtIn: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeSystemConfig {
  systemName: string;
  defaultPageSize: number;
}
