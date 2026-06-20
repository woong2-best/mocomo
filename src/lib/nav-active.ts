import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

/** 사이드바·드로어에서 현재 경로에 맞는 nav 항목만 활성화 */
export function isNavItemActive(pathname: string, href: string, allHrefs: readonly string[]): boolean {
  if (href === DEFAULT_LANDING_PATH) {
    return pathname === DEFAULT_LANDING_PATH || pathname.startsWith("/apt/");
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
