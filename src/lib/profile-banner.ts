import { reencodeBannerVideoBlob } from "@/lib/video-editor/process-video";

/** 프로필 배너 동영상 최대 길이(초) */
export const MAX_PROFILE_BANNER_VIDEO_DURATION_SEC = 10;

export const BANNER_VIDEO_FORMAT_HINT =
  "MP4(H.264·H.265) · WebM · 무음 자동 재생";

export function profileBannerHasVideo(bannerVideoUrl?: string | null): boolean {
  return Boolean(bannerVideoUrl?.trim());
}

export function profileBannerImageUrl(bannerUrl?: string | null, bannerVideoUrl?: string | null): string | null {
  if (profileBannerHasVideo(bannerVideoUrl)) return null;
  const url = bannerUrl?.trim();
  return url || null;
}

export type BannerVideoCodec = "h264" | "hevc" | "webm" | "unknown";

export function browserSupportsH264(): boolean {
  if (typeof document === "undefined") return true;
  const video = document.createElement("video");
  return video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "";
}

export function browserSupportsHevc(): boolean {
  if (typeof document === "undefined") return false;
  const video = document.createElement("video");
  return (
    video.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== "" ||
    video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== ""
  );
}

/** MP4/WebM 헤더에서 대략적인 비디오 코덱 추정 */
export async function sniffBannerVideoCodec(file: File): Promise<BannerVideoCodec> {
  const chunk = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
  const bytes = new Uint8Array(chunk);
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "webm";
  }
  const latin = new TextDecoder("latin1").decode(bytes);
  if (/hvc1|hev1|dvh1|dvhe/.test(latin)) return "hevc";
  if (/avc1|avc3|mp4v/.test(latin)) return "h264";
  return "unknown";
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
    return "MOV 영상은 Chrome·Edge에서 재생되지 않습니다. MP4(H.264·H.265)로 변환 후 올려 주세요.";
  }
  return "이 브라우저에서 재생할 수 없는 영상 형식입니다. MP4(H.264·H.265) 또는 WebM을 사용해 주세요.";
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
      video.onloadeddata = () => done(video.videoWidth > 0 && video.videoHeight > 0);
      video.onerror = () => done(false);
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bannerOutputFilename(originalName: string, mime: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "banner-video";
  const ext = mime.includes("webm") ? "webm" : "mp4";
  return `${base}.${ext}`;
}

/**
 * 배너 업로드용 영상 준비.
 * H.265(HEVC)는 브라우저에서 디코드 가능할 때 H.264 MP4로 재인코딩해 모든 브라우저에서 재생되게 한다.
 */
export async function prepareBannerVideoForUpload(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<File> {
  const codec = await sniffBannerVideoCodec(file);
  const likelyHevc =
    codec === "hevc" ||
    (codec === "unknown" && browserSupportsHevc() && /\.(mp4|m4v|mov)$/i.test(file.name));

  if (likelyHevc) {
    if (!browserSupportsHevc()) {
      throw new Error(
        "H.265(HEVC) 영상은 이 브라우저에서 열 수 없습니다. MP4(H.264)로 변환하거나 Safari·iPhone에서 다시 올려 주세요."
      );
    }
    const duration = await probeVideoDurationSec(file);
    if (duration <= 0) {
      throw new Error("영상 길이를 확인할 수 없습니다.");
    }
    const blob = await reencodeBannerVideoBlob(file, duration, onProgress);
    const type = blob.type || "video/mp4";
    return new File([blob], bannerOutputFilename(file.name, type), { type, lastModified: file.lastModified });
  }

  const playable = await probeVideoPlayable(file);
  if (!playable) {
    throw new Error(
      "이 브라우저에서 재생할 수 없는 영상입니다. MP4(H.264·H.265) 또는 WebM으로 변환 후 올려 주세요."
    );
  }

  return file;
}
