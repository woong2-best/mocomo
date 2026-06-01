"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceFilterPipeline } from "@/lib/face-filters/pipeline";
import type { FaceFilterId } from "@/lib/face-filters/presets";

export function useFaceFilterPipeline(defaultFilter: FaceFilterId = "natural") {
  const pipelineRef = useRef<FaceFilterPipeline | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const [filterId, setFilterId] = useState<FaceFilterId>(defaultFilter);
  const [displayCanvas, setDisplayCanvas] = useState<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  const getPipeline = useCallback(() => {
    if (!pipelineRef.current) pipelineRef.current = new FaceFilterPipeline();
    return pipelineRef.current;
  }, []);

  useEffect(() => {
    pipelineRef.current?.setFilter(filterId);
  }, [filterId]);

  const attachRawStream = useCallback(
    async (stream: MediaStream) => {
      rawStreamRef.current = stream;
      const pipeline = getPipeline();
      pipeline.setFilter(filterId);
      await pipeline.start(stream);
      setDisplayCanvas(pipeline.canvas);
      setActive(true);
    },
    [filterId, getPipeline]
  );

  const stop = useCallback(async () => {
    await pipelineRef.current?.stop();
    rawStreamRef.current?.getTracks().forEach((t) => t.stop());
    rawStreamRef.current = null;
    setDisplayCanvas(null);
    setActive(false);
  }, []);

  const getCompositeStream = useCallback((): MediaStream | null => {
    return pipelineRef.current?.buildCompositeStream() ?? rawStreamRef.current;
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

  return {
    displayCanvas,
    filterId,
    setFilterId,
    active,
    attachRawStream,
    stop,
    getCompositeStream,
    capturePhoto,
    rawStreamRef,
  };
}
