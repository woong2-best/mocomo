/** Client-side forensic renderer diagnostics (console + window.__mocomoForensicDebug). */

import {
  getActiveForensicRecorder,
  getForensicPipelineRecorder,
  type ForensicPipelineSnapshot,
  type ForensicStageEvent,
} from "@/lib/watermark/client/forensic-pipeline-recorder";

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
  cssWidth?: number;
  cssHeight?: number;
  devicePixelRatio?: number;
  message?: string;
};

const EVENT_NAME = "mocomo:forensic-canvas";

export function emitForensicCanvasEvent(detail: ForensicCanvasEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ForensicCanvasEventDetail>(EVENT_NAME, { detail }));
}

export type ForensicCanvasSnapshot = {
  index: number;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  rectWidth: number;
  rectHeight: number;
  devicePixelRatio: number;
  pixelAligned: boolean;
  state: string | null;
  mediaId: string | null;
  sessionId: string | null;
};

export type ForensicDebugStatus = ForensicPipelineSnapshot & {
  canvases: ForensicCanvasSnapshot[];
  readyCount: number;
  loadingCount: number;
  fallbackSeen: boolean;
  sessionFailedSeen: boolean;
};

declare global {
  interface Window {
    __mocomoForensicDebug?: {
      canvases: () => ForensicCanvasSnapshot[];
      status: () => ForensicDebugStatus;
      exportPng: (index?: number) => Promise<void>;
      listen: (handler: (detail: ForensicCanvasEventDetail) => void) => () => void;
      listenPipeline: (handler: (event: ForensicStageEvent) => void) => () => void;
      pipeline: (mediaId?: string) => ForensicPipelineSnapshot;
    };
  }
}

function snapshotCanvas(el: HTMLCanvasElement, index: number): ForensicCanvasSnapshot {
  const rect = el.getBoundingClientRect();
  const cssWidth = Math.round(rect.width);
  const cssHeight = Math.round(rect.height);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const pixelAligned =
    cssWidth >= 8 &&
    cssHeight >= 8 &&
    el.width === cssWidth &&
    el.height === cssHeight &&
    Math.abs(el.clientWidth - cssWidth) <= 1 &&
    Math.abs(el.clientHeight - cssHeight) <= 1;

  return {
    index,
    width: el.width,
    height: el.height,
    clientWidth: el.clientWidth,
    clientHeight: el.clientHeight,
    rectWidth: cssWidth,
    rectHeight: cssHeight,
    devicePixelRatio: dpr,
    pixelAligned,
    state: el.getAttribute("data-forensic-canvas"),
    mediaId: el.getAttribute("data-forensic-media-id"),
    sessionId: el.getAttribute("data-forensic-session-id"),
  };
}

let fallbackSeen = false;
let sessionFailedSeen = false;

export function registerForensicDebug() {
  if (typeof window === "undefined" || window.__mocomoForensicDebug) return;

  window.addEventListener(EVENT_NAME, ((e: Event) => {
    const detail = (e as CustomEvent<ForensicCanvasEventDetail>).detail;
    if (detail.phase === "FALLBACK") fallbackSeen = true;
    if (detail.phase === "SESSION_FAILED") sessionFailedSeen = true;
  }) as EventListener);

  window.__mocomoForensicDebug = {
    canvases() {
      return [...document.querySelectorAll<HTMLCanvasElement>("canvas[data-forensic-canvas]")].map(
        snapshotCanvas
      );
    },
    status(): ForensicDebugStatus {
      const canvases = window.__mocomoForensicDebug!.canvases();
      const pipeline = getActiveForensicRecorder()?.snapshot() ?? emptyPipelineSnapshot();
      const canvasSnap = canvases[0];
      if (canvasSnap) {
        pipeline.canvas = {
          ...pipeline.canvas,
          canvasWidth: canvasSnap.width,
          canvasHeight: canvasSnap.height,
          clientWidth: canvasSnap.clientWidth,
          clientHeight: canvasSnap.clientHeight,
          rectWidth: canvasSnap.rectWidth,
          rectHeight: canvasSnap.rectHeight,
          devicePixelRatio: canvasSnap.devicePixelRatio,
          pixelAligned: canvasSnap.pixelAligned,
        };
      }
      return {
        ...pipeline,
        canvases,
        readyCount: canvases.filter((c) => c.state === "ready").length,
        loadingCount: canvases.filter((c) => c.state === "loading").length,
        fallbackSeen,
        sessionFailedSeen,
      };
    },
    pipeline(mediaId?: string) {
      if (mediaId) return getForensicPipelineRecorder(mediaId).snapshot();
      return getActiveForensicRecorder()?.snapshot() ?? emptyPipelineSnapshot();
    },
    async exportPng(index = 0) {
      const canvas = document.querySelectorAll<HTMLCanvasElement>("canvas[data-forensic-canvas]")[
        index
      ];
      if (!canvas) throw new Error("No forensic canvas found");
      const snap = snapshotCanvas(canvas, index);
      if (snap.state !== "ready") {
        throw new Error(`Canvas not ready (state=${snap.state ?? "missing"})`);
      }
      if (!snap.pixelAligned) {
        console.warn(
          "[forensic] Canvas backing store does not match layout pixels — screenshot detection may fail.",
          snap
        );
      }
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
    listenPipeline(handler) {
      const recorder = getActiveForensicRecorder();
      if (!recorder) return () => {};
      return recorder.on(handler);
    },
  };
}

function emptyPipelineSnapshot(): ForensicPipelineSnapshot {
  return {
    currentStage: "SOURCE_LOADING",
    currentError: null,
    attempts: 0,
    session: {
      mediaId: null,
      sessionId: null,
      opaqueWatermarkId: null,
      loaded: false,
      error: null,
    },
    source: { loaded: false, width: null, height: null, error: null },
    canvas: { pixelAligned: null },
    verification: {
      A: null,
      B: null,
      C: null,
      D: null,
      recoveredCount: 0,
      eccValid: null,
      integrityValid: null,
      finalPass: false,
      detectionStatus: null,
    },
    paintAttempts: [],
    events: [],
  };
}

export { getForensicPipelineRecorder } from "@/lib/watermark/client/forensic-pipeline-recorder";
