import { findContentTypeMismatch } from './file-signature';

/** 各格式的真实文件头，尾部内容用占位字节补齐 */
const png = (rest = 'x') =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from(rest),
  ]);
const jpeg = () =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('jpeg')]);
const gif = () => Buffer.from('GIF89a\x01\x00\x01\x00');
const webp = () =>
  Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x10, 0x00, 0x00, 0x00]),
    Buffer.from('WEBPVP8 '),
  ]);
const pdf = () => Buffer.from('%PDF-1.7\n');
const zip = () =>
  Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('zip')]);

describe('findContentTypeMismatch', () => {
  it('声明与内容吻合时放行', () => {
    expect(findContentTypeMismatch(png(), 'image/png')).toBeNull();
    expect(findContentTypeMismatch(jpeg(), 'image/jpeg')).toBeNull();
    expect(findContentTypeMismatch(gif(), 'image/gif')).toBeNull();
    expect(findContentTypeMismatch(webp(), 'image/webp')).toBeNull();
    expect(findContentTypeMismatch(pdf(), 'application/pdf')).toBeNull();
    expect(findContentTypeMismatch(zip(), 'application/zip')).toBeNull();
  });

  it('换成别的类型名也放行（大小写与空格无关）', () => {
    expect(findContentTypeMismatch(png(), 'IMAGE/PNG')).toBeNull();
    expect(findContentTypeMismatch(jpeg(), ' image/pjpeg ')).toBeNull();
  });

  it('zip 容器允许 Office / epub 等派生类型', () => {
    expect(
      findContentTypeMismatch(
        zip(),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBeNull();
    expect(findContentTypeMismatch(zip(), 'application/epub+zip')).toBeNull();
  });

  it('真 png 声明成别的类型会被拦下', () => {
    expect(findContentTypeMismatch(png(), 'text/plain')).toContain('不符');
    expect(findContentTypeMismatch(pdf(), 'image/png')).toContain('不符');
    expect(findContentTypeMismatch(zip(), 'image/png')).toContain('不符');
  });

  it('无签名的内容保持放行，由声明值决定', () => {
    // HTML 没有魔数，这一版刻意不拦：它会被按 image/png 存并带上 .png 后缀，
    // 响应头是 image/png 时浏览器不会当脚本执行。真正危险的是有签名可查的类型。
    const html = Buffer.from('<html><script>alert(1)</script></html>');

    expect(findContentTypeMismatch(html, 'image/png')).toBeNull();
    expect(
      findContentTypeMismatch(Buffer.from('hello'), 'image/png'),
    ).toBeNull();
    expect(
      findContentTypeMismatch(Buffer.from('just text'), 'text/plain'),
    ).toBeNull();
  });

  it('空 buffer 与短于签名的 buffer 不抛错', () => {
    expect(findContentTypeMismatch(Buffer.alloc(0), 'image/png')).toBeNull();
    expect(
      findContentTypeMismatch(Buffer.from([0x89, 0x50]), 'image/png'),
    ).toBeNull();
  });
});
