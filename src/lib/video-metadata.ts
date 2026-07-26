const META_TIMEOUT_MS = 15000;

export type VideoMetadata = {
  width: number | null;
  height: number | null;
  /** Duration in whole seconds. */
  duration: number | null;
};

export function loadVideoFromBlob(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("영상 정보를 읽는 데 시간이 너무 오래 걸립니다."));
    }, META_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };

    const onReady = () => {
      cleanup();
      resolve(video);
    };

    const onError = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error("영상을 불러올 수 없습니다. 다른 형식(mp4)으로 시도해 주세요."));
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
    video.src = url;
  });
}

export async function getVideoDurationSec(blob: Blob): Promise<number> {
  const video = await loadVideoFromBlob(blob);
  const d = video.duration;
  if (video.src.startsWith("blob:")) URL.revokeObjectURL(video.src);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

/**
 * Read width / height / duration from a video Blob in the browser.
 * Falls back to nulls if metadata never becomes available.
 */
export function readVideoMetadata(blob: Blob, timeoutMs = 8_000): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve({ width: null, height: null, duration: null });
      return;
    }

    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    const finish = (meta: VideoMetadata) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(meta);
    };

    const timer = window.setTimeout(() => {
      finish({ width: null, height: null, duration: null });
    }, timeoutMs);

    video.onloadedmetadata = () => {
      const width = video.videoWidth > 0 ? Math.round(video.videoWidth) : null;
      const height = video.videoHeight > 0 ? Math.round(video.videoHeight) : null;
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.max(1, Math.round(video.duration))
          : null;
      finish({ width, height, duration });
    };
    video.onerror = () => finish({ width: null, height: null, duration: null });
    video.src = url;
  });
}

export function clampMediaInt(value: unknown, max = 100_000): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  if (n <= 0 || n > max) return null;
  return n;
}
