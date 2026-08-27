/** 프로필 배너 동영상 최대 길이(초) */
export const MAX_PROFILE_BANNER_VIDEO_DURATION_SEC = 10;

export function profileBannerHasVideo(bannerVideoUrl?: string | null): boolean {
  return Boolean(bannerVideoUrl?.trim());
}

export function profileBannerImageUrl(bannerUrl?: string | null, bannerVideoUrl?: string | null): string | null {
  if (profileBannerHasVideo(bannerVideoUrl)) return null;
  const url = bannerUrl?.trim();
  return url || null;
}

export async function probeVideoDurationSec(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        resolve(Number.isFinite(video.duration) ? video.duration : 0);
      };
      video.onerror = () => reject(new Error("영상 정보를 읽을 수 없습니다."));
      video.src = url;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function profileBannerVideoTooLong(durationSec: number): boolean {
  return durationSec > MAX_PROFILE_BANNER_VIDEO_DURATION_SEC + 0.25;
}

/** Chrome/Edge 등에서 배너로 쓸 수 없는 컨테이너/코덱 */
export function bannerVideoMimeWarning(mime: string, fileName: string): string | null {
  if (typeof document === "undefined") return null;
  const normalized = mime?.trim().toLowerCase() || guessVideoMimeFromName(fileName);
  const video = document.createElement("video");
  const support = video.canPlayType(normalized);
  if (support === "probably" || support === "maybe") return null;
  if (normalized === "video/quicktime" || /\.mov$/i.test(fileName)) {
    return "MOV 영상은 Chrome·Edge에서 재생되지 않습니다. MP4(H.264)로 변환 후 올려 주세요.";
  }
  return "이 브라우저에서 재생할 수 없는 영상 형식입니다. MP4(H.264) 또는 WebM을 사용해 주세요.";
}

function guessVideoMimeFromName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "webm") return "video/webm";
  if (ext === "mov" || ext === "qt") return "video/quicktime";
  return "video/mp4";
}

/** 업로드 전 실제 디코딩 가능 여부 확인 */
export async function probeVideoPlayable(file: File): Promise<boolean> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<boolean>((resolve) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      const done = (ok: boolean) => {
        video.onloadeddata = null;
        video.onerror = null;
        resolve(ok);
      };
      video.onloadeddata = () => done(true);
      video.onerror = () => done(false);
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
