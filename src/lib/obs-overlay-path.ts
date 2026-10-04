/** OBS browser-source routes — no site chrome, transparent until an alert plays. */
export function isObsOverlayPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/overlay") ||
    pathname.startsWith("/obs") ||
    pathname.startsWith("/widget")
  );
}
