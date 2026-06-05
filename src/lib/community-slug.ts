/** 커뮤니티 URL slug — 한글 이름 지원 */
export function generateCommunitySlug(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return `community-${Date.now().toString(36)}`;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[\s\u00A0_]+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const base =
    normalized.length > 0
      ? normalized.slice(0, 48)
      : trimmed.replace(/\s+/g, "").slice(0, 24);

  return `${base || "community"}-${Date.now().toString(36)}`;
}
