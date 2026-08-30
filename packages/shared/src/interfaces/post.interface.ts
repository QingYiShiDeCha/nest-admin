import type { Status } from '../constants/status';

export interface Post {
  id: number;
  code: string;
  name: string;
  sort: number;
  status: Status;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostListItem extends Post {
  userCount: number;
}
