export interface OnlineUserSession {
  id: number;
  userId: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}
