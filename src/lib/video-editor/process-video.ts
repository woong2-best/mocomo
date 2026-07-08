import { drawCreditWatermark } from "@/lib/media-watermark-canvas";
import { hasActiveWatermark, type WatermarkOptions } from "@/lib/media-watermark";
import { computeOutputDimensions, drawVideoFrame } from "@/lib/video-editor/draw-frame";
import type { VideoEditState } from "@/lib/video-editor/types";

export type VideoWatermark = {
  label: string;
  options: WatermarkOptions;
};

function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "video/webm";
}

function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 15000): Promise<void> {
  if (video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("영상을 재생할 수 없습니다."));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("영상 메타데이터를 읽을 수 없습니다."));
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.03) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

/** 편집 상태를 적용해 영상을 재인코딩한다 (오디오 포함) */
export async function processVideoBlob(
  blob: Blob,
  edit: VideoEditState,
  onProgress?: (ratio: number) => void,
  watermark?: VideoWatermark
): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.src = url;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.crossOrigin = "anonymous";

  try {
    await waitForVideoReady(video);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }

  const duration = video.duration;
  const start = Math.max(0, Math.min(edit.startSec, duration - 0.1));
  const end = Math.max(start + 0.1, Math.min(edit.endSec, duration));
  const clipLen = end - start;

  const dims = computeOutputDimensions(
    video.videoWidth || 720,
    video.videoHeight || 1280,
    edit.rotation,
    edit.cropAspect
  );

  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Canvas를 사용할 수 없습니다.");
  }

  const mimeType = pickRecorderMime();
  const fps = 30;
  const canvasStream = canvas.captureStream(fps);

  let audioCtx: AudioContext | null = null;
  let combinedStream: MediaStream = canvasStream;

  try {
    audioCtx = new AudioContext();
    await audioCtx.resume();
    const source = audioCtx.createMediaElementSource(video);
    const gain = audioCtx.createGain();
    gain.gain.value = edit.muted ? 0 : Math.max(0, Math.min(1, edit.volume));
    source.connect(gain);
    const audioDest = audioCtx.createMediaStreamDestination();
    gain.connect(audioDest);
    const audioTracks = audioDest.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
    }
  } catch {
    /* 오디오 캡처 실패 시 무음 비디오만 */
  }

  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const chunks: Blob[] = [];

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => {
      cleanup();
      reject(new Error("영상 인코딩에 실패했습니다."));
    };
    recorder.onstop = () => {
      cleanup();
      if (chunks.length === 0) {
        reject(new Error("인코딩된 영상 데이터가 비어 있습니다."));
        return;
      }
      resolve(new Blob(chunks, { type: mimeType }));
    };

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.pause();
      void audioCtx?.close();
      combinedStream.getTracks().forEach((t) => t.stop());
    };

    recorder.start(200);

    void (async () => {
      try {
        await seekVideo(video, start);
        await video.play();
      } catch {
        /* 일부 브라우저 자동재생 제한 */
      }

      const started = performance.now();

      const tick = () => {
        if (video.currentTime >= end || video.ended) {
          try {
            drawVideoFrame(ctx, video, edit, dims);
            if (watermark && hasActiveWatermark(watermark.options)) {
              drawCreditWatermark(
                ctx,
                canvas.width,
                canvas.height,
                watermark.label,
                watermark.options
              );
            }
          } catch {
            /* ignore last frame */
          }
          onProgress?.(1);
          video.pause();
          recorder.stop();
          return;
        }

        try {
          drawVideoFrame(ctx, video, edit, dims);
          if (watermark && hasActiveWatermark(watermark.options)) {
            drawCreditWatermark(
              ctx,
              canvas.width,
              canvas.height,
              watermark.label,
              watermark.options
            );
          }
        } catch {
          video.pause();
          recorder.stop();
          reject(new Error("영상 프레임을 처리할 수 없습니다."));
          return;
        }

        const ratio = Math.min(1, (video.currentTime - start) / clipLen);
        onProgress?.(ratio);

        if (performance.now() - started > clipLen * 1000 + 20000) {
          video.pause();
          recorder.stop();
          return;
        }
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    })();
  });
}

/** 구간 자르기 (하위 호환) */
export async function trimVideoBlob(
  blob: Blob,
  startSec: number,
  endSec: number,
  onProgress?: (ratio: number) => void,
  watermark?: VideoWatermark
): Promise<Blob> {
  const video = document.createElement("video");
  const url = URL.createObjectURL(blob);
  video.src = url;
  try {
    await waitForVideoReady(video);
    const edit: VideoEditState = {
      startSec,
      endSec,
      rotation: 0,
      flipX: false,
      flipY: false,
      filterId: "none",
      brightness: 0,
      contrast: 0,
      saturation: 0,
      volume: 1,
      muted: false,
      stickers: [],
    };
    URL.revokeObjectURL(url);
    return processVideoBlob(blob, edit, onProgress, watermark);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export async function watermarkVideoBlob(
  blob: Blob,
  label: string,
  options: WatermarkOptions,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const video = document.createElement("video");
  const url = URL.createObjectURL(blob);
  video.src = url;
  try {
    await waitForVideoReady(video);
    const edit: VideoEditState = {
      startSec: 0,
      endSec: video.duration,
      rotation: 0,
      flipX: false,
      flipY: false,
      filterId: "none",
      brightness: 0,
      contrast: 0,
      saturation: 0,
      volume: 1,
      muted: false,
      stickers: [],
    };
    URL.revokeObjectURL(url);
    return processVideoBlob(blob, edit, onProgress, { label, options });
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
