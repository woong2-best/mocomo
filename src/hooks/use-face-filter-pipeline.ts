"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceFilterPipeline } from "@/lib/face-filters/pipeline";
import {
  preloadFaceLandmarker,
  subscribeLandmarkerLoadState,
  type LandmarkerLoadState,
} from "@/lib/face-filters/landmarker";
import { filterNeedsFaceLandmarks, type FaceFilterId } from "@/lib/face-filters/presets";

export function useFaceFilterPipeline(defaultFilter: FaceFilterId = "natural") {
  const pipelineRef = useRef<FaceFilterPipeline | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const [filterId, setFilterId] = useState<FaceFilterId>(defaultFilter);
  const [displayCanvas, setDisplayCanvas] = useState<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [landmarkerState, setLandmarkerState] = useState<LandmarkerLoadState>("idle");
  const [landmarkerError, setLandmarkerError] = useState("");

  const getPipeline = useCallback(() => {
    if (!pipelineRef.current) pipelineRef.current = new FaceFilterPipeline();
    return pipelineRef.current;
  }, []);

  useEffect(() => {
    preloadFaceLandmarker();
    return subscribeLandmarkerLoadState((state, err) => {
      setLandmarkerState(state);
      setLandmarkerError(err);
    });
  }, []);

  useEffect(() => {
    pipelineRef.current?.setFilter(filterId);
  }, [filterId]);

  const attachRawStream = useCallback(
    async (stream: MediaStream, options?: { mirrored?: boolean }) => {
      rawStreamRef.current = stream;
      const pipeline = getPipeline();
      pipeline.setFilter(filterId);
      setPreviewReady(false);
      await pipeline.start(stream, options);
      setDisplayCanvas(pipeline.canvas);
      setActive(true);
      try {
        await pipeline.waitForPreviewReady();
        setPreviewReady(true);
      } catch {
        // Keep canvas attached; caller may fall back to raw <video> preview.
        setPreviewReady(pipeline.hasDrawnFrame());
      }
    },
    [filterId, getPipeline]
  );

  const stop = useCallback(async (opts?: { stopTracks?: boolean }) => {
    await pipelineRef.current?.stop();
    if (opts?.stopTracks !== false) {
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    }
    setDisplayCanvas(null);
    setActive(false);
    setPreviewReady(false);
  }, []);

  const getCompositeStream = useCallback((): MediaStream | null => {
    return pipelineRef.current?.buildCompositeStream() ?? rawStreamRef.current;
  }, []);

  const waitForBroadcastReady = useCallback(async () => {
    const pipeline = pipelineRef.current;
    if (!pipeline) throw new Error("카메라가 준비되지 않았습니다.");
    await pipeline.waitForBroadcastReady();
  }, []);

  const waitForPreviewReady = useCallback(async () => {
    const pipeline = pipelineRef.current;
    if (!pipeline) throw new Error("카메라가 준비되지 않았습니다.");
    await pipeline.waitForPreviewReady();
    setPreviewReady(true);
  }, []);

  const isPipelineRunning = useCallback(() => {
    return pipelineRef.current?.isRunning() ?? false;
  }, []);

  const getCanvas = useCallback(() => {
    return pipelineRef.current?.canvas ?? null;
  }, []);

  const capturePhoto = useCallback(async () => {
    const pipeline = pipelineRef.current;
    if (!pipeline) throw new Error("카메라가 준비되지 않았습니다.");
    return pipeline.capturePhotoBlob();
  }, []);

  useEffect(() => {
    return () => {
      void pipelineRef.current?.stop();
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const faceTrackingNeeded = filterNeedsFaceLandmarks(filterId);
  const faceTrackingReady =
    !faceTrackingNeeded || landmarkerState === "ready" || pipelineRef.current?.isLandmarkerReady();

  return {
    displayCanvas,
    filterId,
    setFilterId,
    active,
    previewReady,
    attachRawStream,
    stop,
    getCompositeStream,
    waitForBroadcastReady,
    waitForPreviewReady,
    isPipelineRunning,
    getCanvas,
    capturePhoto,
    rawStreamRef,
    landmarkerState,
    landmarkerError,
    faceTrackingNeeded,
    faceTrackingReady,
  };
}
