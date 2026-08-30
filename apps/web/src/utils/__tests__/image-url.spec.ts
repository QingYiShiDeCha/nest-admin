import { describe, expect, it } from 'vitest';

import { isImageUrl, resolveImageUrl } from '@/utils/image-url';

describe('image URL', () => {
  it('给后端相对图片地址补 API 前缀', () => {
    expect(resolveImageUrl('/files/2026/08/30/avatar.png')).toBe(
      '/api/files/2026/08/30/avatar.png',
    );
  });

  it('保留完整地址和已带 API 前缀的地址', () => {
    expect(resolveImageUrl('https://cdn.example.com/avatar.png')).toBe(
      'https://cdn.example.com/avatar.png',
    );
    expect(resolveImageUrl('/api/files/avatar.png')).toBe(
      '/api/files/avatar.png',
    );
  });

  it('识别 AppIcon 支持的图片地址', () => {
    expect(isImageUrl('/uploads/menu.svg?v=1')).toBe(true);
    expect(isImageUrl('i-ri:user-3-line')).toBe(false);
  });
});
