/**
 * X/Twitter-style top progress — minimal, leak-proof.
 *
 * Rules:
 * - Ref-counted start/done
 * - Safety deadline is set ONCE when the bar appears (never refreshed by later starts)
 * - Smooth CSS width animation (no JS trickle stutter)
 */

export type TopProgressSnapshot = {
  active: boolean;
  /** 0..1 — visual width target */
  progress: number;
  /** fading out after complete */
  fading: boolean;
};

type Listener = () => void;

export const TOP_PROGRESS_IDLE: TopProgressSnapshot = {
  active: false,
  progress: 0,
  fading: false,
};

/**
 * When work outlives this, the bar stops advancing and parks at the hold width
 * rather than disappearing. Measured cold navigations run to ~9s, and a bar that
 * vanishes while the app is still frozen reads as "nothing is happening".
 */
const STALL_AFTER_MS = 4_000;
/** Width the bar parks at while still waiting. */
const STALL_PROGRESS = 0.92;
/** Hard ceiling — past this something is genuinely wrong, so clear the bar. */
const ABANDON_AFTER_MS = 30_000;

class TopProgressController {
  private count = 0;
  private progress = 0;
  private active = false;
  private fading = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private abandonTimer: ReturnType<typeof setTimeout> | null = null;
  private crawlTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();
  private cached: TopProgressSnapshot = TOP_PROGRESS_IDLE;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): TopProgressSnapshot {
    return this.cached;
  }

  start(): void {
    if (typeof window === "undefined") return;
    this.count += 1;
    if (this.count !== 1) return;

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.fading = false;
    this.active = true;
    this.progress = 0.14;
    this.emit();
    this.scheduleCrawl();
    // Deadline from FIRST start only — never bump on later requests
    this.armSafetyOnce();
  }

  done(): void {
    if (typeof window === "undefined") return;
    if (this.count <= 0) return;
    this.count -= 1;
    if (this.count > 0) return;
    this.finish();
  }

  fail(): void {
    if (typeof window === "undefined") return;
    if (this.count <= 0) return;
    this.count -= 1;
    if (this.count > 0) return;
    this.reset();
  }

  /** Force-finish (route settled). */
  complete(): void {
    if (typeof window === "undefined") return;
    if (!this.active && this.count === 0) return;
    this.count = 0;
    this.finish();
  }

  forceReset(): void {
    this.count = 0;
    this.reset();
  }

  private armSafetyOnce(): void {
    if (this.safetyTimer) return; // do not refresh
    this.safetyTimer = setTimeout(() => {
      this.safetyTimer = null;
      if (this.count === 0 && !this.active) return;
      // Still waiting: hold instead of vanishing.
      this.clearCrawl();
      this.progress = STALL_PROGRESS;
      this.emit();
      this.abandonTimer = setTimeout(() => {
        this.abandonTimer = null;
        if (this.count > 0 || this.active) {
          this.count = 0;
          this.reset();
        }
      }, ABANDON_AFTER_MS - STALL_AFTER_MS);
    }, STALL_AFTER_MS);
  }

  private clearSafety(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.abandonTimer) {
      clearTimeout(this.abandonTimer);
      this.abandonTimer = null;
    }
  }

  /** Gentle crawl toward 90% with few steps (CSS eases between). */
  private scheduleCrawl(): void {
    this.clearCrawl();
    const steps = [0.28, 0.48, 0.68, 0.86];
    let i = 0;
    const tick = () => {
      if (this.count === 0 || !this.active) return;
      if (i >= steps.length) return;
      this.progress = steps[i]!;
      i += 1;
      this.emit();
      this.crawlTimer = setTimeout(tick, 700);
    };
    this.crawlTimer = setTimeout(tick, 450);
  }

  private clearCrawl(): void {
    if (this.crawlTimer) {
      clearTimeout(this.crawlTimer);
      this.crawlTimer = null;
    }
  }

  private finish(): void {
    this.clearCrawl();
    this.clearSafety();
    this.progress = 1;
    this.fading = false;
    this.active = true;
    this.emit();
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.fading = true;
      this.emit();
      this.hideTimer = setTimeout(() => {
        this.active = false;
        this.fading = false;
        this.progress = 0;
        this.hideTimer = null;
        this.emit();
      }, 200);
    }, 200);
  }

  private reset(): void {
    this.clearCrawl();
    this.clearSafety();
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.active = false;
    this.fading = false;
    this.progress = 0;
    this.emit();
  }

  private emit(): void {
    const idle = !this.active && this.progress === 0 && !this.fading;
    const next: TopProgressSnapshot = idle
      ? TOP_PROGRESS_IDLE
      : { active: this.active, progress: this.progress, fading: this.fading };
    if (
      this.cached === next ||
      (this.cached.active === next.active &&
        this.cached.progress === next.progress &&
        this.cached.fading === next.fading)
    ) {
      return;
    }
    this.cached = next;
    for (const listener of this.listeners) listener();
  }
}

export const topProgress = new TopProgressController();

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function resolveHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (typeof Request !== "undefined" && input instanceof Request) {
    input.headers.forEach((v, k) => {
      if (!headers.has(k)) headers.set(k, v);
    });
  }
  return headers;
}

/**
 * Only track user mutations — never GET/RSC/polling (those caused stuck bars).
 */
export function shouldTrackFetch(input: RequestInfo | URL, init?: RequestInit): boolean {
  if (typeof window === "undefined") return false;
  const method = resolveMethod(input, init);
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;

  const headers = resolveHeaders(input, init);
  if (headers.get("Next-Router-Prefetch") === "1") return false;
  if (headers.get("RSC") === "1") return false;
  if (headers.has("Next-Router-State-Tree")) return false;
  if (headers.get("X-Moco-No-Progress") === "1") return false;
  if (headers.has("Next-Action")) return true;

  try {
    const url = new URL(resolveUrl(input), window.location.origin);
    const { pathname } = url;
    if (pathname.startsWith("/_next/")) return false;
    if (pathname.startsWith("/api/auth/")) return false;
    if (pathname.startsWith("/api/socket-auth")) return false;
    if (pathname.startsWith("/api/health")) return false;
    // Background telemetry — not user-initiated (scroll view counts, visits, bootstrap).
    if (/^\/api\/posts\/[^/]+\/view$/.test(pathname)) return false;
    if (/^\/api\/anime\/[^/]+\/view$/.test(pathname)) return false;
    if (pathname.startsWith("/api/signals/")) return false;
    if (pathname === "/api/platform/bootstrap") return false;
    // Same-origin mutations + cross-origin uploads
    return true;
  } catch {
    return false;
  }
}

let fetchPatched = false;

export function installTopProgressFetch(): () => void {
  if (typeof window === "undefined" || fetchPatched) return () => {};
  fetchPatched = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!shouldTrackFetch(input, init)) return original(input, init);
    topProgress.start();
    try {
      const res = await original(input, init);
      topProgress.done();
      return res;
    } catch (err) {
      topProgress.fail();
      throw err;
    }
  };

  return () => {
    window.fetch = original;
    fetchPatched = false;
  };
}
