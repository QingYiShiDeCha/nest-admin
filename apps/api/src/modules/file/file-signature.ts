/**
 * 客户端声明的 Content-Type 完全由请求方控制，不能直接信。
 * 这里用文件头魔数做一次反向校验：识别得出类型时，声明值必须与内容吻合。
 */
interface SignatureRule {
  /** 内容实际属于的类型，只用于报错文案 */
  readonly label: string;
  matches(buffer: Buffer): boolean;
  accepts(declared: string): boolean;
}

const startsWithBytes = (
  buffer: Buffer,
  bytes: number[],
  offset = 0,
): boolean =>
  buffer.length >= offset + bytes.length &&
  bytes.every((byte, index) => buffer[offset + index] === byte);

/** zip 容器同时承载了 Office、epub、jar 等一整套格式，只嗅探得出 PK\x03\x04 */
const ZIP_LIKE = [
  'application/zip',
  'application/x-zip-compressed',
  'application/epub+zip',
  'application/java-archive',
  'application/vnd.openxmlformats-officedocument.',
  'application/vnd.oasis.opendocument.',
];

const RULES: SignatureRule[] = [
  {
    label: 'image/jpeg',
    matches: (buffer) => startsWithBytes(buffer, [0xff, 0xd8, 0xff]),
    accepts: (declared) =>
      declared === 'image/jpeg' || declared === 'image/pjpeg',
  },
  {
    label: 'image/png',
    matches: (buffer) =>
      startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    accepts: (declared) => declared === 'image/png',
  },
  {
    label: 'image/gif',
    matches: (buffer) =>
      startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38]) &&
      /^[ab]a$/i.test(buffer.subarray(4, 6).toString('latin1')),
    accepts: (declared) => declared === 'image/gif',
  },
  {
    // RIFF....WEBP：头 4 字节是 RIFF，格式标记在第 8 字节
    label: 'image/webp',
    matches: (buffer) =>
      startsWithBytes(buffer, [0x52, 0x49, 0x46, 0x46]) &&
      startsWithBytes(buffer, [0x57, 0x45, 0x42, 0x50], 8),
    accepts: (declared) => declared === 'image/webp',
  },
  {
    label: 'application/pdf',
    matches: (buffer) => startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46]),
    accepts: (declared) => declared === 'application/pdf',
  },
  {
    label: 'zip 容器',
    matches: (buffer) => startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]),
    accepts: (declared) =>
      ZIP_LIKE.some(
        (allowed) => declared === allowed || declared.startsWith(allowed),
      ),
  },
];

/**
 * 声明类型与内容不符时返回给用户看的提示，吻合（或内容无签名可比对）时返回 null。
 *
 * 无签名的类型（如 text/plain）刻意保持放行：本函数只负责「嗅得出就必须对得上」，
 * 不承担识别任意格式的职责。image/svg+xml 属于可脚本类型，
 * 允许它进 UPLOAD_ALLOWED_MIME_TYPES 的部署方需要自行评估存储型 XSS 风险。
 */
export function findContentTypeMismatch(
  buffer: Buffer,
  declaredMimeType: string,
): string | null {
  const declared = declaredMimeType.toLowerCase().trim();

  for (const rule of RULES) {
    if (rule.matches(buffer)) {
      return rule.accepts(declared)
        ? null
        : `文件内容与声明的类型不符，实际是 ${rule.label}`;
    }
  }

  return null;
}
