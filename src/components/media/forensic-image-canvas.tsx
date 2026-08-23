"use client";

import { useEffect, useRef, useState } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import type { ForensicClientVerification } from "@/components/media/use-forensic-watermark-session";
import {
  embedInvisibleWatermark,
  applyCaptureResilienceLayers,
} from "@/lib/watermark/encoder/spread-spectrum";
import {
  emitForensicCanvasEvent,
  getForensicPipelineRecorder,
  registerForensicDebug,
} from "@/lib/watermark/client/forensic-diagnostics";
import {
  formatVerifyRetryReason,
  quadrantScoresFromResult,
  verifyWatermarkFrame,
} from "@/lib/watermark/verify-watermark-frame";
import { cn } from "@/lib/utils";
import {
  alignPaintSizeToDisplay,
  drawSourceFit,
  isForensicDisplaySizeReady,
  resolveForensicPaintSize,
} from "@/components/media/forensic-canvas-fit";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  config: ForensicRenderConfig;
  clientVerification: ForensicClientVerification | null;
  mediaId?: string | null;
  objectFit?: "cover" | "contain";
  fillParent?: boolean;
  onMarked?: () => void;
  onFailed?: (message: string) => void;
};

async function loadBitmap(src: string): Promise<ImageBitmap> {
  const res = await fetch(src, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`Paid media fetch failed (${res.status})`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

export function ForensicImageCanvas({
  src,
  alt = "",
  className,
  config,
  clientVerification,
  mediaId = null,
  objectFit = "cover",
  fillParent = false,
  onMarked,
  onFailed,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const layoutHandlerRef = useRef<(() => void) | null>(null);
  const attemptRef = useRef(0);
  const [ready, setReady] = useState(false);
  const failedRef = useRef(false);
  const notifiedRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    registerForensicDebug();
  }, []);

  useEffect(() => {
    const recorder = getForensicPipelineRecorder(mediaId ?? null);
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let retryTimer = 0;
    let failTimer = 0;

    setReady(false);
    readyRef.current = false;
    failedRef.current = false;
    notifiedRef.current = false;
    attemptRef.current = 0;

    recorder.record({
      stage: "CANVAS_CREATED",
      mediaId,
      sessionId: config.sessionId,
    });
    emitForensicCanvasEvent({
      phase: "CREATED",
      mediaId,
      sessionId: config.sessionId,
    });

    const fail = (message: string, stageError?: string) => {
      if (cancelled || failedRef.current) return;
      failedRef.current = true;
      recorder.record({
        stage: "FAILED",
        mediaId,
        sessionId: config.sessionId,
        error: stageError ?? message,
      });
      emitForensicCanvasEvent({
        phase: "FALLBACK",
        mediaId,
        sessionId: config.sessionId,
        message,
      });
      onFailed?.(message);
    };

    const paint = () => {
      if (cancelled || failedRef.current) return;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      const bitmap = bitmapRef.current;
      if (!wrap || !canvas || !bitmap) return;

      attemptRef.current += 1;
      const attempt = attemptRef.current;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

      const computed = resolveForensicPaintSize(wrap, bitmap.width, bitmap.height, objectFit, {
        fillParent: fillParent && objectFit === "cover",
      });

      if (!computed) {
        recorder.recordPaintAttempt({
          attempt,
          verifyRun: false,
          retryReason: "resolveForensicPaintSize_null",
        });
        retryTimer = window.setTimeout(paint, 50);
        return;
      }

      const wrapMode = fillParent && objectFit === "cover" ? "fill" : "fixed";
      const alignedRaw = alignPaintSizeToDisplay(wrap, canvas, computed, wrapMode);
      const rect = canvas.getBoundingClientRect();
      const sizingReady = alignedRaw
        ? isForensicDisplaySizeReady(computed, alignedRaw)
        : false;

      const computedArea = computed.cssWidth * computed.cssHeight;
      const rectArea = Math.max(1, Math.round(rect.width) * Math.round(rect.height));
      const areaRatio = computedArea > 0 ? rectArea / computedArea : 0;
      const computedLong = Math.max(computed.cssWidth, computed.cssHeight);
      const rectLong = Math.max(Math.round(rect.width), Math.round(rect.height));
      const longEdgeRatio = computedLong > 0 ? rectLong / computedLong : 0;

      if (!alignedRaw || !sizingReady) {
        recorder.recordPaintAttempt({
          attempt,
          computedWidth: computed.cssWidth,
          computedHeight: computed.cssHeight,
          rectWidth: Math.round(rect.width),
          rectHeight: Math.round(rect.height),
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          areaRatio,
          longEdgeRatio,
          sizingReady: false,
          verifyRun: false,
          retryReason: !alignedRaw ? "alignPaintSizeToDisplay_null" : "isForensicDisplaySizeReady_false",
        });
        retryTimer = window.setTimeout(paint, 50);
        return;
      }

      const aligned = alignedRaw;
      const { width: w, height: h } = aligned;
      recorder.record({
        stage: "CANVAS_SIZED",
        mediaId,
        sessionId: config.sessionId,
        attempt,
        computedWidth: computed.cssWidth,
        computedHeight: computed.cssHeight,
        canvasWidth: w,
        canvasHeight: h,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        rectWidth: Math.round(rect.width),
        rectHeight: Math.round(rect.height),
        devicePixelRatio: dpr,
        areaRatio,
        longEdgeRatio,
      });

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        recorder.recordPaintAttempt({
          attempt,
          computedWidth: computed.cssWidth,
          computedHeight: computed.cssHeight,
          verifyRun: false,
          retryReason: "canvas_2d_unavailable",
        });
        fail("Canvas 2D unavailable", "canvas_2d_unavailable");
        return;
      }

      drawSourceFit(ctx, bitmap, bitmap.width, bitmap.height, w, h, objectFit);
      recorder.record({
        stage: "SOURCE_DRAWN",
        mediaId,
        sessionId: config.sessionId,
        attempt,
        sourceWidth: bitmap.width,
        sourceHeight: bitmap.height,
        canvasWidth: w,
        canvasHeight: h,
      });

      const imageData = ctx.getImageData(0, 0, w, h);
      const frame = { width: w, height: h, data: imageData.data };
      const preEmbed = new Uint8ClampedArray(imageData.data);
      embedInvisibleWatermark(frame, config, 0);
      applyCaptureResilienceLayers(frame, preEmbed, config, 0);
      recorder.record({ stage: "WATERMARK_EMBEDDED", mediaId, sessionId: config.sessionId, attempt });

      if (!clientVerification?.opaqueWatermarkId) {
        recorder.recordPaintAttempt({
          attempt,
          computedWidth: computed.cssWidth,
          computedHeight: computed.cssHeight,
          rectWidth: Math.round(rect.width),
          rectHeight: Math.round(rect.height),
          canvasWidth: w,
          canvasHeight: h,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          areaRatio,
          longEdgeRatio,
          sizingReady: true,
          verifyRun: false,
          retryReason: "missing_client_verification_context",
        });
        fail("Missing verification context", "missing_client_verification_context");
        return;
      }

      const verifyResult = verifyWatermarkFrame({
        frame,
        renderConfig: config,
        opaqueWatermarkId: clientVerification.opaqueWatermarkId,
        contentId: clientVerification.contentId,
        phase: 0,
      });

      recorder.setVerificationFromResult({
        regionScores: verifyResult.regionScores,
        recoveredCount: verifyResult.regionScores.filter((r) => r.recovered).length,
        eccValid: verifyResult.eccValid,
        integrityValid: verifyResult.integrityValid,
        status: verifyResult.status,
        finalPass: verifyResult.finalPass,
      });

      const scores = quadrantScoresFromResult(verifyResult);
      const recoveredCount = verifyResult.regionScores.filter((r) => r.recovered).length;

      if (!verifyResult.finalPass) {
        const retryReason = formatVerifyRetryReason(verifyResult);
        recorder.recordPaintAttempt({
          attempt,
          computedWidth: computed.cssWidth,
          computedHeight: computed.cssHeight,
          rectWidth: Math.round(rect.width),
          rectHeight: Math.round(rect.height),
          canvasWidth: w,
          canvasHeight: h,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          areaRatio,
          longEdgeRatio,
          sizingReady: true,
          verifyRun: true,
          verifyPass: false,
          retryReason,
          quadrantScores: scores,
          recoveredCount,
          eccValid: verifyResult.eccValid,
          integrityValid: verifyResult.integrityValid,
          detectionStatus: verifyResult.status,
        });
        if (readyRef.current) return;
        retryTimer = window.setTimeout(paint, 50);
        return;
      }

      recorder.recordPaintAttempt({
        attempt,
        computedWidth: computed.cssWidth,
        computedHeight: computed.cssHeight,
        rectWidth: Math.round(rect.width),
        rectHeight: Math.round(rect.height),
        canvasWidth: w,
        canvasHeight: h,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        areaRatio,
        longEdgeRatio,
        sizingReady: true,
        verifyRun: true,
        verifyPass: true,
        quadrantScores: scores,
        recoveredCount,
        eccValid: verifyResult.eccValid,
        integrityValid: verifyResult.integrityValid,
        detectionStatus: verifyResult.status,
      });

      ctx.putImageData(imageData, 0, 0);
      readyRef.current = true;
      setReady(true);
      recorder.record({
        stage: "READY",
        mediaId,
        sessionId: config.sessionId,
        attempt,
        canvasWidth: w,
        canvasHeight: h,
        eccValid: verifyResult.eccValid,
        integrityValid: verifyResult.integrityValid,
        detectionStatus: verifyResult.status,
        recoveredCount,
        quadrantScores: scores,
      });
      emitForensicCanvasEvent({
        phase: "RENDERED",
        mediaId,
        sessionId: config.sessionId,
        width: w,
        height: h,
        cssWidth: aligned.cssWidth,
        cssHeight: aligned.cssHeight,
        devicePixelRatio: aligned.devicePixelRatio,
      });
    };

    recorder.record({ stage: "SOURCE_LOADING", mediaId, sessionId: config.sessionId });

    void (async () => {
      try {
        const bitmap = await loadBitmap(src);
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current = bitmap;
        recorder.record({
          stage: "SOURCE_LOADED",
          mediaId,
          sessionId: config.sessionId,
          sourceWidth: bitmap.width,
          sourceHeight: bitmap.height,
        });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) paint();
          });
        });
        const wrap = wrapRef.current;
        if (wrap) {
          const onLayoutChange = () => {
            if (readyRef.current && fillParent && objectFit === "cover") {
              paint();
              return;
            }
            if (!readyRef.current) paint();
          };
          layoutHandlerRef.current = onLayoutChange;
          ro = new ResizeObserver(onLayoutChange);
          ro.observe(wrap);
          if (wrap.parentElement) ro.observe(wrap.parentElement);
          window.addEventListener("resize", onLayoutChange);
        }
        failTimer = window.setTimeout(() => {
          if (!readyRef.current && !failedRef.current) {
            const snap = recorder.snapshot();
            fail(
              "Canvas render timed out",
              `timeout_after_${snap.attempts}_attempts_stage_${snap.currentStage}`
            );
          }
        }, 12_000);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Image load failed";
        recorder.record({
          stage: "FAILED",
          mediaId,
          sessionId: config.sessionId,
          error: message,
        });
        fail(message, message);
      }
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      const layoutHandler = layoutHandlerRef.current;
      if (layoutHandler) window.removeEventListener("resize", layoutHandler);
      layoutHandlerRef.current = null;
      window.clearTimeout(retryTimer);
      window.clearTimeout(failTimer);
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [src, config, clientVerification, objectFit, onFailed, mediaId, fillParent]);

  useEffect(() => {
    if (!ready || notifiedRef.current) return;
    notifiedRef.current = true;
    onMarked?.();
  }, [ready, onMarked]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative overflow-hidden",
        fillParent && objectFit === "cover" ? "size-full" : "inline-block shrink-0",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        data-forensic-canvas={ready ? "ready" : "loading"}
        data-forensic-media-id={mediaId ?? undefined}
        data-forensic-session-id={config.sessionId}
        className={cn("block", !ready && "opacity-0")}
        aria-label={alt}
        role="img"
      />
    </div>
  );
}
