export function loadVideoFromBlob(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상을 불러올 수 없습니다."));
    };
    video.src = url;
  });
}

export async function getVideoDurationSec(blob: Blob): Promise<number> {
  const video = await loadVideoFromBlob(blob);
  const d = video.duration;
  URL.revokeObjectURL(video.src);
  return Number.isFinite(d) ? d : 0;
}

export function revokeVideoElement(video: HTMLVideoElement) {
  if (video.src.startsWith("blob:")) URL.revokeObjectURL(video.src);
}
