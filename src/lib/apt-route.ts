import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

export function isAptPath(pathname: string): boolean {
  return pathname === DEFAULT_LANDING_PATH || pathname.startsWith("/apt/");
}
