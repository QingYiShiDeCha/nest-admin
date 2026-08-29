export type FileStorageDriver = 'local' | 's3';

export interface FileUploadResult {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  storage: FileStorageDriver;
}
