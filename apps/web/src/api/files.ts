import type { FileUploadResult } from '@nest-admin/shared';

import { httpPost } from '@/api/http';

export function apiUploadFile(file: File): Promise<FileUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  return httpPost<FileUploadResult>('/files/upload', formData);
}
