const META_TIMEOUT_MS = 15000;

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
