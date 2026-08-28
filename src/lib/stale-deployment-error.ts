const RELOAD_GUARD_KEY = "mocomo:stale-deploy-reload";

/** 배포 직후 예전 JS/Server Action 해시와 서버가 어긋날 때 */
export function isStaleDeploymentError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string; digest?: string };
  const name = err.name ?? "";
  const message = err.message ?? "";
  const digest = err.digest ?? "";

  if (name === "ChunkLoadError") return true;
  if (name === "UnrecognizedActionError") return true;
  if (message.includes("Loading chunk")) return true;
  if (message.includes("Failed to fetch dynamically imported module")) return true;
  if (message.includes("Server Action") && message.includes("was not found")) return true;
  if (digest.includes("UnrecognizedActionError")) return true;

  return false;
}

/** 한 세션당 한 번만 강제 새로고침 (무한 루프 방지) */
export function reloadForStaleDeployment(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_v", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}
