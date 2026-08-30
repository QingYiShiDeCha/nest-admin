import { buildLocalUploadPrefixes } from './file-storage.factory';

describe('本地上传静态资源路径', () => {
  it('同时支持直接访问和 API 前缀访问', () => {
    expect(buildLocalUploadPrefixes('api', '/files')).toEqual([
      '/files/',
      '/api/files/',
    ]);
  });

  it('API 前缀为空时不重复注册同一路径', () => {
    expect(buildLocalUploadPrefixes('', '/uploads')).toEqual(['/uploads/']);
  });
});
