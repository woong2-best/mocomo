/** Client-side forensic renderer diagnostics (console + CustomEvent). */

export type ForensicCanvasPhase =
  | "CREATED"
  | "RENDERED"
  | "FALLBACK"
  | "SESSION_LOADED"
  | "SESSION_FAILED";

export type ForensicCanvasEventDetail = {
  phase: ForensicCanvasPhase;
  mediaId?: string | null;
  sessionId?: string | null;
  width?: number;
  height?: number;
  message?: string;
};

const EVENT_NAME = "mocomo:forensic-canvas";

export function emitForensicCanvasEvent(detail: ForensicCanvasEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ForensicCanvasEventDetail>(EVENT_NAME, { detail }));
  if (process.env.NODE_ENV !== "production") {
    console.info(`[forensic] ${detail.phase}`, detail);
  }
}

export type ForensicCanvasSnapshot = {
  index: number;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  state: string | null;
  mediaId: string | null;
  sessionId: string | null;
};

declare global {
  interface Window {
    __mocomoForensicDebug?: {
      canvases: () => ForensicCanvasSnapshot[];
      exportPng: (index?: number) => Promise<void>;
      listen: (handler: (detail: ForensicCanvasEventDetail) => void) => () => void;
    };
  }
}

export function registerForensicDebug() {
  if (typeof window === "undefined" || window.__mocomoForensicDebug) return;

  window.__mocomoForensicDebug = {
    canvases() {
      return [...document.querySelectorAll<HTMLCanvasElement>("canvas[data-forensic-canvas]")].map(
        (el, index) => ({
          index,
          width: el.width,
          height: el.height,
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
          state: el.getAttribute("data-forensic-canvas"),
          mediaId: el.getAttribute("data-forensic-media-id"),
          sessionId: el.getAttribute("data-forensic-session-id"),
        })
      );
    },
    async exportPng(index = 0) {
      const canvas = document.querySelectorAll<HTMLCanvasElement>("canvas[data-forensic-canvas]")[
        index
      ];
      if (!canvas) throw new Error("No forensic canvas found");
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Canvas export failed (tainted or empty)");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forensic-canvas-${canvas.width}x${canvas.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
    },
    listen(handler) {
      const wrapped = (e: Event) => handler((e as CustomEvent<ForensicCanvasEventDetail>).detail);
      window.addEventListener(EVENT_NAME, wrapped);
      return () => window.removeEventListener(EVENT_NAME, wrapped);
    },
  };
}
