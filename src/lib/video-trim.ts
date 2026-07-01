import { drawCreditWatermark } from "@/lib/media-watermark-canvas";

function pickRecorderMime(): string {
  const candidates = [
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

function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 12000): Promise<void> {
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

/** 브라우저에서 구간 자르기 (짧은 클립·게시용) */
export async function trimVideoBlob(
  blob: Blob,
  startSec: number,
  endSec: number,
  onProgress?: (ratio: number) => void,
  watermarkLabel?: string
): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");

  try {
    await waitForVideoReady(video);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }

  const duration = video.duration;
  const start = Math.max(0, Math.min(startSec, duration - 0.1));
  const end = Math.max(start + 0.1, Math.min(endSec, duration));
  const clipLen = end - start;

  const w = video.videoWidth || 720;
  const h = video.videoHeight || 1280;
  if (w < 2 || h < 2) {
    URL.revokeObjectURL(url);
    throw new Error("영상 해상도를 읽을 수 없습니다.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Canvas를 사용할 수 없습니다.");
  }

  const mimeType = pickRecorderMime();
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상 인코딩에 실패했습니다."));
    };
    recorder.onstop = () => {
      URL.revokeObjectURL(url);
      video.pause();
      if (chunks.length === 0) {
        reject(new Error("자른 영상 데이터가 비어 있습니다."));
        return;
      }
      resolve(new Blob(chunks, { type: mimeType }));
    };

    recorder.start(200);
    video.currentTime = start;

    const onSeeked = async () => {
      video.removeEventListener("seeked", onSeeked);
      try {
        await video.play();
      } catch {
        /* 일부 브라우저 자동재생 제한 — 프레임은 timeupdate로 그림 */
      }

      const started = performance.now();

      const tick = () => {
        if (video.currentTime >= end || video.ended) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (watermarkLabel) {
              drawCreditWatermark(ctx, canvas.width, canvas.height, watermarkLabel);
            }
          } catch {
            /* ignore last frame draw error */
          }
          onProgress?.(1);
          video.pause();
          recorder.stop();
          return;
        }
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (watermarkLabel) {
            drawCreditWatermark(ctx, canvas.width, canvas.height, watermarkLabel);
          }
        } catch {
          video.pause();
          recorder.stop();
          reject(new Error("영상 프레임을 처리할 수 없습니다. 원본 업로드를 시도해 주세요."));
          return;
        }
        const ratio = Math.min(1, (video.currentTime - start) / clipLen);
        onProgress?.(ratio);
        if (performance.now() - started > clipLen * 1000 + 12000) {
          video.pause();
          recorder.stop();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    video.addEventListener("seeked", onSeeked);
  });
}

/** 전체 영상에 크레딧 라벨을 굽기 (재인코딩) */
export async function watermarkVideoBlob(
  blob: Blob,
  label: string,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");

  try {
    await waitForVideoReady(video);
    const duration = video.duration;
    URL.revokeObjectURL(url);
    return trimVideoBlob(blob, 0, duration, onProgress, label);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
