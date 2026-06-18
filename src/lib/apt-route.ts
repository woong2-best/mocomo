export function isAptPath(pathname: string): boolean {
  return pathname === "/apt" || pathname.startsWith("/apt/");
}
