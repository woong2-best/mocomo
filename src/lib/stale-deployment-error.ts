const RELOAD_GUARD_KEY = "mocomo:stale-deploy-reload";
const BUILD_ID_META = "mocomo-build-id";

/** React minified hook / hydration failures often mean stale JS after deploy */
const REACT_STALE_PATTERNS = [
  /Minified React error #310/i,
  /Minified React error #300/i,
  /Minified React error #301/i,
  /Minified React error #418/i,
  /Minified React error #423/i,
  /Rendered more hooks than during the previous render/i,
  /Rendered fewer hooks than expected/i,
  /Hydration failed/i,
];

/** 배포 직후 예전 JS/Server Action 해시와 서버가 어긋날 때 */
export function isStaleDeploymentError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string; digest?: string };
  const name = err.name ?? "";
  const message = err.message ?? String(error);
  const digest = err.digest ?? "";

  if (name === "ChunkLoadError") return true;
  if (name === "UnrecognizedActionError") return true;
  if (message.includes("Loading chunk")) return true;
  if (message.includes("Failed to fetch dynamically imported module")) return true;
  if (message.includes("Server Action") && message.includes("was not found")) return true;
  if (digest.includes("UnrecognizedActionError")) return true;
  if (REACT_STALE_PATTERNS.some((re) => re.test(message))) return true;

  return false;
}

export function readPageBuildId(): string | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(`meta[name="${BUILD_ID_META}"]`)?.getAttribute("content") ?? null;
}

/** HTML meta build id vs /api/build-id — 불일치면 예전 JS 번들 */
export async function detectStaleBuildBundle(): Promise<boolean> {
  const pageId = readPageBuildId();
  if (!pageId) return false;
  try {
    const res = await fetch("/api/build-id", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { id?: string };
    return Boolean(data.id && data.id !== pageId);
  } catch {
    return false;
  }
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
