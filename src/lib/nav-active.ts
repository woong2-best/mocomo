/** 사이드바·드로어에서 현재 경로에 맞는 nav 항목만 활성화 */
export function isNavItemActive(
  pathname: string,
  href: string,
  allHrefs: readonly string[],
  ownProfilePath?: string | null
): boolean {
  if (href === "/my-page" && ownProfilePath) {
    if (pathname === ownProfilePath || pathname.startsWith(`${ownProfilePath}/`)) return true;
  }

  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  const hasMoreSpecificNavMatch = allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`))
  );

  return !hasMoreSpecificNavMatch;
}

/** 로그인 사용자의 내 페이지 href — /my-page 리다이렉트 루프 방지 */
export function resolveMyPageHref(username: string | null | undefined): string {
  return username ? `/u/${username}` : "/my-page";
}
