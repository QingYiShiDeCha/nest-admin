export function resolveLoginRedirect(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value === '/login' ||
    value.startsWith('/login?')
  ) {
    return '/';
  }

  return value;
}
