/** DB·API에서 배열 대신 null/문자열/객체가 올 때 .map 크래시 방지 */
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

export function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
