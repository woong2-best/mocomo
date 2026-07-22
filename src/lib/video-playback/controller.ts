/**
 * Global singleton: at most one HTMLVideoElement may be playing at a time.
 * Handles page visibility pause/resume.
 */

type PlayReason = "autoplay" | "user" | "hover" | "visibility";

export type RegisteredPlayer = {
  id: string;
  getVideo: () => HTMLVideoElement | null;
  /** Called when this player becomes inactive (another took over). */
  onDeactivate?: () => void;
  /** True if last intentional play was autoplay (for visibility resume). */
  autoplayIntent: boolean;
};

class VideoPlaybackController {
  private players = new Map<string, RegisteredPlayer>();
  private activeId: string | null = null;
  private resumeId: string | null = null;
  private visibilityBound = false;
  private lastScrollY = 0;
  private scrollDir: "down" | "up" = "down";
  private order: string[] = [];

  register(player: RegisteredPlayer): void {
    this.players.set(player.id, player);
    if (!this.order.includes(player.id)) this.order.push(player.id);
    this.ensureVisibilityListener();
  }

  unregister(id: string): void {
    if (this.activeId === id) this.activeId = null;
    if (this.resumeId === id) this.resumeId = null;
    this.players.delete(id);
    this.order = this.order.filter((x) => x !== id);
  }

  getActiveId(): string | null {
    return this.activeId;
  }

  getScrollDirection(): "down" | "up" {
    return this.scrollDir;
  }

  noteScroll(y: number): void {
    if (y > this.lastScrollY + 2) this.scrollDir = "down";
    else if (y < this.lastScrollY - 2) this.scrollDir = "up";
    this.lastScrollY = y;
  }

  /** Ids registered near `id` in DOM order (for prefetch). */
  getNeighbors(id: string, ahead: number): string[] {
    const idx = this.order.indexOf(id);
    if (idx < 0) return [];
    const dir = this.scrollDir === "down" ? 1 : -1;
    const out: string[] = [];
    for (let i = 1; i <= ahead; i++) {
      const n = this.order[idx + dir * i];
      if (n) out.push(n);
    }
    return out;
  }

  /**
   * Request exclusive playback. Pauses every other registered video.
   * Returns false if play() was rejected.
   */
  async requestPlay(id: string, reason: PlayReason = "user"): Promise<boolean> {
    const player = this.players.get(id);
    const video = player?.getVideo() ?? null;
    if (!player || !video) return false;

    // Already exclusive + playing — do not re-enter play() (avoids decode stutter).
    if (this.activeId === id && !video.paused && !video.ended) {
      player.autoplayIntent = reason === "autoplay" || reason === "visibility";
      this.resumeId = id;
      return true;
    }

    for (const [otherId, other] of this.players) {
      if (otherId === id) continue;
      const ov = other.getVideo();
      if (ov && !ov.paused) {
        ov.pause();
        other.onDeactivate?.();
      }
      other.autoplayIntent = false;
    }

    player.autoplayIntent = reason === "autoplay" || reason === "visibility";
    this.activeId = id;
    this.resumeId = id;

    try {
      await video.play();
      return true;
    } catch {
      if (this.activeId === id) this.activeId = null;
      return false;
    }
  }

  pause(id: string, clearResume = false): void {
    const player = this.players.get(id);
    const video = player?.getVideo();
    if (video && !video.paused) video.pause();
    if (player) player.autoplayIntent = false;
    if (this.activeId === id) this.activeId = null;
    if (clearResume && this.resumeId === id) this.resumeId = null;
  }

  pauseAll(): void {
    for (const [, player] of this.players) {
      const v = player.getVideo();
      if (v && !v.paused) v.pause();
      player.autoplayIntent = false;
    }
    this.activeId = null;
  }

  private ensureVisibilityListener(): void {
    if (this.visibilityBound || typeof document === "undefined") return;
    this.visibilityBound = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    if (typeof window !== "undefined") {
      window.addEventListener(
        "scroll",
        () => this.noteScroll(window.scrollY || 0),
        { passive: true }
      );
    }
  }

  private onVisibility = (): void => {
    if (document.hidden) {
      const current = this.activeId;
      if (current) {
        this.resumeId = current;
        const player = this.players.get(current);
        const v = player?.getVideo();
        if (v && !v.paused) v.pause();
        this.activeId = null;
      }
      return;
    }

    const resume = this.resumeId;
    if (!resume) return;
    const player = this.players.get(resume);
    if (!player?.autoplayIntent) return;
    void this.requestPlay(resume, "visibility");
  };
}

let singleton: VideoPlaybackController | null = null;

/** Safe accessor for SSR — returns null on the server. */
export function getVideoPlaybackController(): VideoPlaybackController | null {
  if (typeof window === "undefined") return null;
  if (!singleton) singleton = new VideoPlaybackController();
  return singleton;
}
