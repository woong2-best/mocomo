/** 사이드바·드로어에서 현재 경로에 맞는 nav 항목만 활성화 */
export function isNavItemActive(pathname: string, href: string, allHrefs: readonly string[]): boolean {
  if (href === "/") return pathname === "/";
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
