export function getSetCookies(
  headers: Record<string, string | string[] | undefined>
): string[] {
  const value = headers['set-cookie'];

  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}
