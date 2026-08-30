const remoteImagePattern = /^(?:https?:\/\/|data:image\/|blob:)/i;
const relativeImagePattern =
  /^\/.*\.(?:png|jpe?g|gif|svg|webp|ico)(?:[?#].*)?$/i;

export function isImageUrl(value: string | null | undefined): boolean {
  const source = value?.trim();

  return (
    !!source &&
    (remoteImagePattern.test(source) || relativeImagePattern.test(source))
  );
}

export function resolveImageUrl(
  value: string | null | undefined,
): string | undefined {
  const source = value?.trim();

  if (!source || remoteImagePattern.test(source) || !source.startsWith('/')) {
    return source || undefined;
  }

  const apiBase = (import.meta.env.VITE_API_BASE || '/api')
    .trim()
    .replace(/\/$/, '');

  if (
    !apiBase ||
    apiBase === '/' ||
    (apiBase.startsWith('/') &&
      (source === apiBase || source.startsWith(`${apiBase}/`)))
  ) {
    return source;
  }

  return `${apiBase}${source}`;
}
