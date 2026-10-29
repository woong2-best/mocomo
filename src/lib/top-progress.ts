/**
 * X/Twitter-style top progress — minimal, leak-proof.
 *
 * Rules:
 * - Ref-counted start/done
 * - Safety deadline is set ONCE when the bar appears (never refreshed by later starts)
 * - Smooth CSS width animation (no JS trickle stutter)
 * - Finish when route/mutation work ends — never wait on images/fonts (those load after paint)
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
 * When work outlives this, keep creeping so the bar does not look frozen.
 * Complete still happens only when the ref-count hits 0.
 */
export const STALL_AFTER_MS = 4_000;
/** Width where the first crawl hands off to the slow stall crawl. */
export const STALL_PROGRESS = 0.92;
/** Slow crawl ceiling — never 100% until done(). */
export const STALL_CEILING = 0.99;
/** Time to ease from STALL_PROGRESS to STALL_CEILING. */
export const STALL_CRAWL_MS = 20_000;
export const STALL_TICK_MS = 400;
/** Hard ceiling — past this something is genuinely wrong, so clear the bar. */
export const ABANDON_AFTER_MS = 30_000;
/** Click/popstate start with no route change and no tracked fetch. */
export const ORPHAN_HOLD_MS = 1_500;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function isProgressDebug(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_PROGRESS === "1";
}

function isNavigationHint(reason?: string): boolean {
  if (!reason) return false;
  return /^(click|popstate|router-push)\b/.test(reason);
}

function isFetchReason(reason?: string): boolean {
  return !!reason && /^fetch\b/.test(reason);
}

class TopProgressController {
  private count = 0;
  private hintHolds = 0;
  private fetchHolds = 0;
  private progress = 0;
  private active = false;
  private fading = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private abandonTimer: ReturnType<typeof setTimeout> | null = null;
  private crawlTimer: ReturnType<typeof setTimeout> | null = null;
  private orphanTimer: ReturnType<typeof setTimeout> | null = null;
  private finishPromise: Promise<void> | null = null;
  private listeners = new Set<Listener>();
  private cached: TopProgressSnapshot = TOP_PROGRESS_IDLE;
  private sessionStartedAt = 0;
  private stallElapsedMs = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): TopProgressSnapshot {
    return this.cached;
  }

  start(reason?: string): void {
    if (typeof window === "undefined") return;
    this.count += 1;
    if (isNavigationHint(reason)) {
      this.hintHolds += 1;
      this.armOrphanHold();
    } else if (isFetchReason(reason)) {
      this.fetchHolds += 1;
    }

    if (this.count === 1) this.sessionStartedAt = Date.now();
    this.debug("start", reason);
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

  done(reason?: string): void {
    if (typeof window === "undefined") return;
    if (this.count <= 0) return;
    this.accountRelease(reason);
    this.count -= 1;
    this.debug("done", reason);
    if (this.hintHolds <= 0) this.clearOrphanHold();
    if (isFetchReason(reason)) this.tryReleaseOrphan();
    if (this.count > 0) return;
    void this.paintThenFinish();
  }

  fail(reason?: string): void {
    if (typeof window === "undefined") return;
    if (this.count <= 0) return;
    this.accountRelease(reason);
    this.count -= 1;
    this.debug("fail", reason);
    if (this.hintHolds <= 0) this.clearOrphanHold();
    if (isFetchReason(reason)) this.tryReleaseOrphan();
    if (this.count > 0) return;
    this.reset();
  }

  /** Force-finish — drains all holds, then finishes on next paint. */
  complete(reason?: string): void {
    if (typeof window === "undefined") return;
    if (!this.active && this.count === 0) return;
    this.count = 0;
    this.hintHolds = 0;
    this.fetchHolds = 0;
    this.clearOrphanHold();
    this.debug("complete", reason);
    void this.paintThenFinish();
  }

  forceReset(reason?: string): void {
    this.count = 0;
    this.hintHolds = 0;
    this.fetchHolds = 0;
    this.clearOrphanHold();
    this.debug("forceReset", reason);
    this.reset();
  }

  /** True while any navigation / mutation hold is open. */
  isBusy(): boolean {
    return this.count > 0 || this.active || this.fading;
  }

  /** True only while start() is still unmatched — not during fade/idle. */
  hasOpenHold(): boolean {
    return this.count > 0;
  }

  /** Test helper — run the 4s stall handoff immediately. */
  enterStallNow(): void {
    this.enterStall("stall");
  }

  /** Test helper — advance the 92%→99% crawl by one tick (or `dtMs`). */
  advanceStallCrawl(dtMs = STALL_TICK_MS): void {
    this.stallElapsedMs += dtMs;
    this.applyStallProgress();
    if (this.stallElapsedMs < STALL_CRAWL_MS && this.active) {
      this.scheduleStallTick();
    }
  }

  /** Test helper — run the orphan-hold check immediately. */
  releaseOrphanIfIdle(): void {
    this.tryReleaseOrphan();
  }

  private elapsedMs(): number {
    if (!this.sessionStartedAt) return 0;
    return Date.now() - this.sessionStartedAt;
  }

  private debug(event: string, reason?: string): void {
    if (!isProgressDebug()) return;
    console.debug("[top-progress]", event, {
      reason: reason ?? "(none)",
      elapsedMs: this.elapsedMs(),
      count: this.count,
      hintHolds: this.hintHolds,
      fetchHolds: this.fetchHolds,
      progress: this.progress,
    });
  }

  private accountRelease(reason?: string): void {
    if (isFetchReason(reason)) {
      this.fetchHolds = Math.max(0, this.fetchHolds - 1);
      return;
    }
    if (this.hintHolds > 0 && (isNavigationHint(reason) || reason === "route" || reason === "orphan" || !reason)) {
      this.hintHolds = Math.max(0, this.hintHolds - 1);
    }
  }

  private armOrphanHold(): void {
    this.clearOrphanHold();
    this.orphanTimer = setTimeout(() => {
      this.orphanTimer = null;
      this.tryReleaseOrphan();
    }, ORPHAN_HOLD_MS);
  }

  private clearOrphanHold(): void {
    if (this.orphanTimer) {
      clearTimeout(this.orphanTimer);
      this.orphanTimer = null;
    }
  }

  private tryReleaseOrphan(): void {
    if (this.hintHolds <= 0) {
      this.clearOrphanHold();
      return;
    }
    if (this.fetchHolds > 0) return;
    this.debug("orphan", "no route change and no tracked fetch");
    this.done("orphan");
  }

  private armSafetyOnce(): void {
    if (this.safetyTimer) return; // do not refresh
    this.safetyTimer = setTimeout(() => {
      this.safetyTimer = null;
      if (this.count === 0 && !this.active) return;
      this.enterStall("stall");
      this.abandonTimer = setTimeout(() => {
        this.abandonTimer = null;
        if (this.count > 0 || this.active) {
          this.debug("abandon", "stall/abandon deadline");
          this.count = 0;
          this.hintHolds = 0;
          this.fetchHolds = 0;
          this.clearOrphanHold();
          this.reset();
        }
      }, ABANDON_AFTER_MS - STALL_AFTER_MS);
    }, STALL_AFTER_MS);
  }

  private enterStall(reason: string): void {
    this.clearCrawl();
    this.stallElapsedMs = 0;
    this.progress = STALL_PROGRESS;
    this.debug(reason, "92% handoff — slow crawl to 99%");
    this.emit();
    this.scheduleStallTick();
  }

  private scheduleStallTick(): void {
    this.clearCrawl();
    this.crawlTimer = setTimeout(() => {
      this.crawlTimer = null;
      if (!this.active) return;
      this.stallElapsedMs += STALL_TICK_MS;
      this.applyStallProgress();
      if (this.stallElapsedMs < STALL_CRAWL_MS && this.count > 0) {
        this.scheduleStallTick();
      }
    }, STALL_TICK_MS);
  }

  private applyStallProgress(): void {
    if (!this.active) return;
    const t = Math.min(1, this.stallElapsedMs / STALL_CRAWL_MS);
    this.progress = STALL_PROGRESS + (STALL_CEILING - STALL_PROGRESS) * t;
    this.emit();
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
      this.crawlTimer = setTimeout(tick, 420);
    };
    this.crawlTimer = setTimeout(tick, 280);
  }

  private clearCrawl(): void {
    if (this.crawlTimer) {
      clearTimeout(this.crawlTimer);
      this.crawlTimer = null;
    }
  }

  /** One frame so the 100% state can paint, then fade — never wait on assets. */
  private async paintThenFinish(): Promise<void> {
    if (!this.finishPromise) {
      this.finishPromise = nextFrame().finally(() => {
        this.finishPromise = null;
      });
    }
    await this.finishPromise;
    if (this.count > 0 || !this.active) return;
    this.finish();
  }

  private finish(): void {
    this.clearCrawl();
    this.clearSafety();
    this.clearOrphanHold();
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
      }, 160);
    }, 120);
  }

  private reset(): void {
    this.clearCrawl();
    this.clearSafety();
    this.clearOrphanHold();
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.active = false;
    this.fading = false;
    this.progress = 0;
    this.sessionStartedAt = 0;
    this.stallElapsedMs = 0;
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

/** bfcache restore — drop a bar that was mid-flight when the tab was frozen. */
export function handleTopProgressPageShow(event: { persisted: boolean }): void {
  if (!event.persisted) return;
  topProgress.forceReset("pageshow-bfcache");
}

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

export function isNextNavigationFetch(input: RequestInfo | URL, init?: RequestInit): boolean {
  if (resolveMethod(input, init) !== "GET") return false;
  const headers = resolveHeaders(input, init);
  if (headers.get("Next-Router-Prefetch") === "1") return false;
  if (headers.get("Next-Router-Segment-Prefetch")) return false;
  const isRsc = headers.get("RSC") === "1" || headers.has("Next-Router-State-Tree");
  if (!isRsc) return false;
  // Next 15 `router.prefetch()` for dynamic pages often omits Next-Router-Prefetch.
  // Those look like navigations but fire on hover/touch/scroll — only follow a real hold.
  return topProgress.hasOpenHold();
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
    if (pathname.startsWith("/api/live/ai-host/")) return false;
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
    const trackMutation = shouldTrackFetch(input, init);
    const trackNavigation = isNextNavigationFetch(input, init);
    const track = trackMutation || trackNavigation;

    let fetchReason: string | undefined;
    if (track) {
      const method = resolveMethod(input, init);
      let url = resolveUrl(input);
      try {
        url = new URL(url, window.location.origin).pathname;
      } catch {
        /* keep raw */
      }
      fetchReason = `fetch ${method} ${url}`;
      topProgress.start(fetchReason);
    }

    try {
      const res = await original(input, init);
      if (track) topProgress.done(fetchReason);
      return res;
    } catch (err) {
      if (track) topProgress.fail(fetchReason);
      throw err;
    }
  };

  return () => {
    window.fetch = original;
    fetchPatched = false;
  };
}
