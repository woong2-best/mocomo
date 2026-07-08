/** 커뮤니티 URL slug — URL 안전 문자만 사용 */
export function generateCommunitySlug(name: string): string {
  const trimmed = name.trim();
  const normalized = trimmed
    .toLowerCase()
    .replace(/[\s\u00A0_]+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const base = (normalized.length > 0 ? normalized : "community").slice(0, 48);
  return `${base}-${Date.now().toString(36)}`;
}

export function normalizeCommunitySlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug).trim();
  } catch {
    return slug.trim();
  }
}
