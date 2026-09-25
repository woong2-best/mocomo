/** 커뮤니티 갤러리 경로 — /c/[slug] 및 하위 */
export function isCommunityServerPath(pathname: string): boolean {
  return /^\/c\/[^/]+/.test(pathname);
}

export function getDefaultChannelSlug(): string {
  return "posts";
}
