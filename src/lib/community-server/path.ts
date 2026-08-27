/** 커뮤니티 서버(Discord) 레이아웃 경로 판별 — /c/[slug] 및 하위 채널 */
export function isCommunityServerPath(pathname: string): boolean {
  return /^\/c\/[^/]+/.test(pathname);
}

export function getDefaultChannelSlug(): string {
  return "posts";
}
