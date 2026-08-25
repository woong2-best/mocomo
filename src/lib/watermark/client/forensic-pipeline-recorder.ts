/** Forensic render pipeline stage recorder — production-safe, no userId in logs. */

import type { WatermarkQuadrantKey } from "@/lib/watermark/config";
import type { WatermarkDetectionStatus } from "@/lib/watermark/types";

export type ForensicPipelineStage =
  | "SOURCE_LOADING"
  | "SOURCE_LOADED"
  | "SESSION_LOADING"
  | "SESSION_READY"
  | "SESSION_FAILED"
  | "CANVAS_CREATED"
  | "CANVAS_SIZED"
  | "SIZING_WAIT"
  | "SOURCE_DRAWN"
  | "WATERMARK_EMBEDDED"
  | "VERIFICATION_STARTED"
  | "QUADRANT_A_RESULT"
  | "QUADRANT_B_RESULT"
  | "QUADRANT_C_RESULT"
  | "QUADRANT_D_RESULT"
  | "ECC_RESULT"
  | "INTEGRITY_RESULT"
  | "READY"
  | "FAILED";

export type ForensicDimensions = {
  canvasWidth?: number;
  canvasHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
  rectWidth?: number;
  rectHeight?: number;
  devicePixelRatio?: number;
  sourceWidth?: number;
  sourceHeight?: number;
};

export type ForensicQuadrantScores = Partial<
  Record<WatermarkQuadrantKey, number>
>;

export type ForensicStageEvent = ForensicDimensions & {
  timestamp: number;
  mediaId: string | null;
  sessionId: string | null;
  stage: ForensicPipelineStage;
  attempt?: number;
  error?: string;
  quadrantScores?: ForensicQuadrantScores;
  recoveredCount?: number;
  eccValid?: boolean;
  integrityValid?: boolean;
  detectionStatus?: WatermarkDetectionStatus;
  retryReason?: string;
  computedWidth?: number;
  computedHeight?: number;
  areaRatio?: number;
  longEdgeRatio?: number;
  verifyRun?: boolean;
  meta?: Record<string, string | number | boolean | null>;
};

export type ForensicPaintAttempt = {
  attempt: number;
  timestamp: number;
  computedWidth?: number;
  computedHeight?: number;
  rectWidth?: number;
  rectHeight?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
  areaRatio?: number;
  longEdgeRatio?: number;
  sizingReady?: boolean;
  verifyRun: boolean;
  verifyPass?: boolean;
  retryReason?: string;
  quadrantScores?: ForensicQuadrantScores;
  recoveredCount?: number;
  eccValid?: boolean;
  integrityValid?: boolean;
  detectionStatus?: WatermarkDetectionStatus;
  mergedCodewordAgreement?: number;
  hasExpectedIntegrity?: boolean;
  decodeOk?: boolean;
};

export type ForensicPipelineSnapshot = {
  currentStage: ForensicPipelineStage;
  currentError: string | null;
  attempts: number;
  session: {
    mediaId: string | null;
    sessionId: string | null;
    opaqueWatermarkId: string | null;
    loaded: boolean;
    error: string | null;
  };
  source: {
    loaded: boolean;
    width: number | null;
    height: number | null;
    error: string | null;
  };
  canvas: ForensicDimensions & { pixelAligned: boolean | null };
  verification: {
    A: ForensicQuadrantVerification | null;
    B: ForensicQuadrantVerification | null;
    C: ForensicQuadrantVerification | null;
    D: ForensicQuadrantVerification | null;
    recoveredCount: number;
    eccValid: boolean | null;
    integrityValid: boolean | null;
    finalPass: boolean;
    detectionStatus: WatermarkDetectionStatus | null;
  };
  paintAttempts: ForensicPaintAttempt[];
  events: ForensicStageEvent[];
};

export type ForensicQuadrantVerification = {
  spatialScore: number;
  recovered: boolean;
  eccValid: boolean | null;
  integrityValid: boolean | null;
};

const MAX_EVENTS = 200;
const MAX_ATTEMPTS = 100;

type Listener = (event: ForensicStageEvent) => void;

function cloneEvent(event: ForensicStageEvent): ForensicStageEvent {
  return {
    ...event,
    quadrantScores: event.quadrantScores ? { ...event.quadrantScores } : undefined,
    meta: event.meta ? { ...event.meta } : undefined,
  };
}

export class ForensicPipelineRecorder {
  private mediaId: string | null = null;
  private sessionId: string | null = null;
  private opaqueWatermarkId: string | null = null;
  private currentStage: ForensicPipelineStage = "SOURCE_LOADING";
  private currentError: string | null = null;
  private events: ForensicStageEvent[] = [];
  private paintAttempts: ForensicPaintAttempt[] = [];
  private listeners = new Set<Listener>();

  private source = { loaded: false, width: null as number | null, height: null as number | null, error: null as string | null };
  private session = { loaded: false, error: null as string | null };
  private canvas: ForensicDimensions & { pixelAligned: boolean | null } = { pixelAligned: null };
  private verification: ForensicPipelineSnapshot["verification"] = {
    A: null,
    B: null,
    C: null,
    D: null,
    recoveredCount: 0,
    eccValid: null,
    integrityValid: null,
    finalPass: false,
    detectionStatus: null,
  };

  bindMedia(mediaId: string | null) {
    if (this.mediaId === mediaId) return;
    this.reset(mediaId);
  }

  reset(mediaId: string | null = null) {
    this.mediaId = mediaId;
    this.sessionId = null;
    this.opaqueWatermarkId = null;
    this.currentStage = "SOURCE_LOADING";
    this.currentError = null;
    this.events = [];
    this.paintAttempts = [];
    this.source = { loaded: false, width: null, height: null, error: null };
    this.session = { loaded: false, error: null };
    this.canvas = { pixelAligned: null };
    this.verification = {
      A: null,
      B: null,
      C: null,
      D: null,
      recoveredCount: 0,
      eccValid: null,
      integrityValid: null,
      finalPass: false,
      detectionStatus: null,
    };
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  record(partial: Omit<ForensicStageEvent, "timestamp" | "mediaId" | "sessionId" | "stage"> & {
    stage: ForensicPipelineStage;
    mediaId?: string | null;
    sessionId?: string | null;
  }) {
    if (partial.mediaId !== undefined) this.mediaId = partial.mediaId;
    if (partial.sessionId !== undefined) this.sessionId = partial.sessionId;

    const event: ForensicStageEvent = cloneEvent({
      timestamp: Date.now(),
      mediaId: this.mediaId,
      sessionId: this.sessionId,
      ...partial,
    });

    this.currentStage = event.stage;
    if (event.error) this.currentError = event.error;

    this.applySideEffects(event);
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.shift();

    this.emitConsole(event);
    for (const listener of this.listeners) listener(event);
    return event;
  }

  recordPaintAttempt(attempt: Omit<ForensicPaintAttempt, "timestamp">) {
    const row: ForensicPaintAttempt = { ...attempt, timestamp: Date.now() };
    this.paintAttempts.push(row);
    if (this.paintAttempts.length > MAX_ATTEMPTS) this.paintAttempts.shift();

    this.record({
      stage: attempt.verifyRun ? "VERIFICATION_STARTED" : "SIZING_WAIT",
      attempt: attempt.attempt,
      computedWidth: attempt.computedWidth,
      computedHeight: attempt.computedHeight,
      rectWidth: attempt.rectWidth,
      rectHeight: attempt.rectHeight,
      canvasWidth: attempt.canvasWidth,
      canvasHeight: attempt.canvasHeight,
      clientWidth: attempt.clientWidth,
      clientHeight: attempt.clientHeight,
      areaRatio: attempt.areaRatio,
      longEdgeRatio: attempt.longEdgeRatio,
      quadrantScores: attempt.quadrantScores,
      recoveredCount: attempt.recoveredCount,
      eccValid: attempt.eccValid,
      integrityValid: attempt.integrityValid,
      detectionStatus: attempt.detectionStatus,
      verifyRun: attempt.verifyRun,
      retryReason: attempt.retryReason,
      error: attempt.verifyPass === false ? attempt.retryReason : undefined,
      meta: {
        sizingReady: attempt.sizingReady ?? null,
        verifyPass: attempt.verifyPass ?? null,
        mergedCodewordAgreement: attempt.mergedCodewordAgreement ?? null,
        hasExpectedIntegrity: attempt.hasExpectedIntegrity ?? null,
        decodeOk: attempt.decodeOk ?? null,
      },
    });
  }

  setSessionMeta(input: {
    sessionId?: string | null;
    opaqueWatermarkId?: string | null;
  }) {
    if (input.sessionId !== undefined) this.sessionId = input.sessionId;
    if (input.opaqueWatermarkId !== undefined) this.opaqueWatermarkId = input.opaqueWatermarkId;
  }

  setVerificationFromResult(result: {
    regionScores: Array<{ key: WatermarkQuadrantKey; score: number; recovered: boolean }>;
    recoveredCount: number;
    eccValid: boolean;
    integrityValid: boolean;
    status: WatermarkDetectionStatus;
    finalPass: boolean;
  }) {
    for (const r of result.regionScores) {
      const entry: ForensicQuadrantVerification = {
        spatialScore: r.score,
        recovered: r.recovered,
        eccValid: result.eccValid,
        integrityValid: result.integrityValid,
      };
      this.verification[r.key] = entry;
      this.record({
        stage: `QUADRANT_${r.key}_RESULT` as ForensicPipelineStage,
        quadrantScores: { [r.key]: r.score },
        recoveredCount: result.recoveredCount,
        eccValid: result.eccValid,
        integrityValid: result.integrityValid,
        detectionStatus: result.status,
        meta: { recovered: r.recovered },
      });
    }
    this.verification.recoveredCount = result.recoveredCount;
    this.verification.eccValid = result.eccValid;
    this.verification.integrityValid = result.integrityValid;
    this.verification.finalPass = result.finalPass;
    this.verification.detectionStatus = result.status;

    this.record({ stage: "ECC_RESULT", eccValid: result.eccValid });
    this.record({ stage: "INTEGRITY_RESULT", integrityValid: result.integrityValid });
  }

  snapshot(): ForensicPipelineSnapshot {
    return {
      currentStage: this.currentStage,
      currentError: this.currentError,
      attempts: this.paintAttempts.length,
      session: {
        mediaId: this.mediaId,
        sessionId: this.sessionId,
        opaqueWatermarkId: this.opaqueWatermarkId,
        loaded: this.session.loaded,
        error: this.session.error,
      },
      source: { ...this.source },
      canvas: { ...this.canvas },
      verification: {
        A: this.verification.A ? { ...this.verification.A } : null,
        B: this.verification.B ? { ...this.verification.B } : null,
        C: this.verification.C ? { ...this.verification.C } : null,
        D: this.verification.D ? { ...this.verification.D } : null,
        recoveredCount: this.verification.recoveredCount,
        eccValid: this.verification.eccValid,
        integrityValid: this.verification.integrityValid,
        finalPass: this.verification.finalPass,
        detectionStatus: this.verification.detectionStatus,
      },
      paintAttempts: this.paintAttempts.map((a) => ({ ...a })),
      events: this.events.map((e) => cloneEvent(e)),
    };
  }

  private applySideEffects(event: ForensicStageEvent) {
    switch (event.stage) {
      case "SOURCE_LOADED":
        this.source.loaded = true;
        this.source.width = event.sourceWidth ?? null;
        this.source.height = event.sourceHeight ?? null;
        this.source.error = null;
        break;
      case "SOURCE_LOADING":
        this.source.loaded = false;
        this.source.error = null;
        break;
      case "SESSION_READY":
        this.session.loaded = true;
        this.session.error = null;
        break;
      case "SESSION_FAILED":
        this.session.loaded = false;
        this.session.error = event.error ?? "session failed";
        break;
      case "CANVAS_SIZED":
        Object.assign(this.canvas, {
          canvasWidth: event.canvasWidth,
          canvasHeight: event.canvasHeight,
          clientWidth: event.clientWidth,
          clientHeight: event.clientHeight,
          rectWidth: event.rectWidth,
          rectHeight: event.rectHeight,
          devicePixelRatio: event.devicePixelRatio,
        });
        break;
      case "READY":
        this.currentError = null;
        break;
      case "FAILED":
        this.currentError = event.error ?? this.currentError ?? "failed";
        break;
      default:
        break;
    }
  }

  private emitConsole(event: ForensicStageEvent) {
    const payload = {
      stage: event.stage,
      mediaId: event.mediaId,
      sessionId: event.sessionId,
      attempt: event.attempt,
      error: event.error,
      canvasWidth: event.canvasWidth,
      canvasHeight: event.canvasHeight,
      clientWidth: event.clientWidth,
      clientHeight: event.clientHeight,
      rectWidth: event.rectWidth,
      rectHeight: event.rectHeight,
      devicePixelRatio: event.devicePixelRatio,
      sourceWidth: event.sourceWidth,
      sourceHeight: event.sourceHeight,
      quadrantScores: event.quadrantScores,
      recoveredCount: event.recoveredCount,
      eccValid: event.eccValid,
      integrityValid: event.integrityValid,
      detectionStatus: event.detectionStatus,
      retryReason: event.retryReason,
      areaRatio: event.areaRatio,
      longEdgeRatio: event.longEdgeRatio,
      verifyRun: event.verifyRun,
      computedWidth: event.computedWidth,
      computedHeight: event.computedHeight,
      meta: event.meta,
    };
    if (event.stage === "FAILED" || event.stage === "SESSION_FAILED") {
      console.warn("[forensic-pipeline]", payload);
    } else {
      console.info("[forensic-pipeline]", payload);
    }
  }
}

const recorders = new Map<string, ForensicPipelineRecorder>();

export function getForensicPipelineRecorder(mediaId: string | null): ForensicPipelineRecorder {
  const key = mediaId ?? "__anonymous__";
  let recorder = recorders.get(key);
  if (!recorder) {
    recorder = new ForensicPipelineRecorder();
    recorder.bindMedia(mediaId);
    recorders.set(key, recorder);
  }
  return recorder;
}

export function getActiveForensicRecorder(): ForensicPipelineRecorder | null {
  if (recorders.size === 0) return null;
  return [...recorders.values()].at(-1) ?? null;
}
