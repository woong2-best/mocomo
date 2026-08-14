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
