export const FILE_STORAGE_DRIVER = ['local', 's3'] as const;

export type FileStorageDriver = (typeof FILE_STORAGE_DRIVER)[number];

export const FILE_CATEGORY = [
  'image',
  'video',
  'audio',
  'document',
  'archive',
  'other',
] as const;

export type FileCategory = (typeof FILE_CATEGORY)[number];

export interface FileResource {
  id: number;
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  extension: string | null;
  category: FileCategory;
  size: number;
  storage: FileStorageDriver;
  uploaderId: number | null;
  uploaderUsername: string | null;
  referenceCount: number;
  createdAt: string;
}

export type FileUploadResult = Omit<FileResource, 'referenceCount'>;
