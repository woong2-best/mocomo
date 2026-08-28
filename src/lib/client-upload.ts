import { guessImageMime } from "@/lib/gallery-image-upload";
import { guessVideoMime } from "@/lib/gallery-video-upload";
import { applyImageWatermarkBlob } from "@/lib/media-watermark-canvas";
import { hasActiveWatermark, type WatermarkOptions } from "@/lib/media-watermark";
import { watermarkVideoBlob } from "@/lib/video-trim";
import { DIRECT_UPLOAD_THRESHOLD } from "@/lib/upload-limits";

/** Compose 백그라운드 업로드 — 사이트 전역 상단 진행 바 깜빡임 방지 */
const NO_PROGRESS_INIT: RequestInit = {
  headers: { "X-Moco-No-Progress": "1" },
};

export type UploadMediaOptions = {
  /** 게시물용 — @username · site 크레딧 라벨 */
  watermarkLabel?: string;
  watermarkOptions?: WatermarkOptions;
};

/** 상대에게 전달 가능한 절대 URL로 변환 */
export function toAbsoluteUploadUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  if (typeof window !== "undefined" && trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
}

async function readUploadError(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || null;
  } catch {
    return null;
  }
}

async function presignedUpload(
  file: File,
  filename: string,
  contentType: string,
  category: "image" | "video" | "audio"
): Promise<{ publicUrl: string } | { error: string }> {
  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Moco-No-Progress": "1",
    },
    body: JSON.stringify({ filename, contentType, category }),
    credentials: "include",
  });

  if (!presignRes.ok) {
    return {
      error:
        (await readUploadError(presignRes)) ||
        (presignRes.status === 401
          ? "로그인이 필요합니다. 다시 로그인해 주세요."
          : presignRes.status === 429
            ? "업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
            : "업로드 URL을 받지 못했습니다."),
    };
  }

  const { uploadUrl, publicUrl, token } = (await presignRes.json()) as {
    uploadUrl: string;
    publicUrl: string;
    token?: string;
  };

  const headers: Record<string, string> = { "Content-Type": contentType };
  if (token) headers.Authorization = `Bearer ${token}`;

  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers,
  });

  if (!put.ok) {
    return {
      error: `스토리지 업로드에 실패했습니다. (${put.status})`,
    };
  }
  return { publicUrl };
}

async function localUpload(
  file: File,
  category: "image" | "video" | "audio",
  opts?: UploadMediaOptions
): Promise<{ publicUrl?: string; error?: string }> {
  const form = new FormData();
  form.set("file", file);
  form.set("category", category);
  if (opts?.watermarkLabel) {
    form.set("watermark", "1");
    form.set("creditLabel", opts.watermarkLabel);
    if (opts.watermarkOptions) {
      form.set("watermarkDiagonal", opts.watermarkOptions.diagonal ? "1" : "0");
      form.set("watermarkCorner", opts.watermarkOptions.corner ? "1" : "0");
    }
  }
  const localRes = await fetch("/api/upload/local", {
    method: "POST",
    body: form,
    credentials: "include",
    ...NO_PROGRESS_INIT,
  });
  return (await localRes.json().catch(() => ({}))) as {
    publicUrl?: string;
    error?: string;
  };
}

async function prepareUploadFile(
  file: File,
  category: "image" | "video" | "audio",
  opts?: UploadMediaOptions
): Promise<File> {
  const label = opts?.watermarkLabel;
  const options = opts?.watermarkOptions;
  if (!label || !hasActiveWatermark(options)) return file;
  if (category === "image") {
    const blob = await applyImageWatermarkBlob(file, label, options!);
    const mime = blob.type || file.type || "image/jpeg";
    return new File([blob], file.name.replace(/\.\w+$/, "") + (mime.includes("png") ? ".png" : ".jpg"), {
      type: mime,
    });
  }
  if (category === "video") {
    const blob = await watermarkVideoBlob(file, label, options!, undefined);
    const ext = blob.type.includes("webm") ? "webm" : "mp4";
    return new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), { type: blob.type });
  }
  return file;
}

/** Upload image via server (Supabase Storage / disk), then S3 presigned fallback */
export async function uploadImageBlob(
  blob: Blob,
  filename: string,
  opts?: UploadMediaOptions
): Promise<string> {
  const contentType =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : guessImageMime(filename, blob.type);
  let file = new File([blob], filename, { type: contentType });
  file = await prepareUploadFile(file, "image", opts);

  const localBody = await localUpload(file, "image", opts);
  if (localBody.publicUrl) return localBody.publicUrl;

  const direct = await presignedUpload(file, file.name, file.type || contentType, "image");
  if ("publicUrl" in direct) return direct.publicUrl;

  throw new Error(localBody.error || direct.error || "이미지 업로드에 실패했습니다.");
}

/** Upload video — Storage 직접 업로드 우선 (Vercel 본문 한도·대용량) */
export async function uploadVideoBlob(
  blob: Blob,
  filename: string,
  opts?: UploadMediaOptions
): Promise<string> {
  const contentType = guessVideoMime(filename, blob.type);
  let file = new File([blob], filename, { type: contentType });
  file = await prepareUploadFile(file, "video", opts);

  if (file.size > DIRECT_UPLOAD_THRESHOLD) {
    const direct = await presignedUpload(file, file.name, file.type || contentType, "video");
    if ("publicUrl" in direct) return direct.publicUrl;
    // 대용량은 서버 경유가 불가하므로 직접 업로드 실패 사유를 우선 노출
    const localBody = await localUpload(file, "video", opts);
    if (localBody.publicUrl) return localBody.publicUrl;
    throw new Error(
      direct.error ||
        localBody.error ||
        "영상 업로드에 실패했습니다. 용량(일반 50MB·프리미엄 100MB)과 로그인 상태를 확인해 주세요."
    );
  }

  const localBody = await localUpload(file, "video", opts);
  if (localBody.publicUrl) return localBody.publicUrl;

  const direct = await presignedUpload(file, file.name, file.type || contentType, "video");
  if ("publicUrl" in direct) return direct.publicUrl;

  throw new Error(
    localBody.error ||
      direct.error ||
      "영상 업로드에 실패했습니다. 용량(일반 50MB·프리미엄 100MB)과 로그인 상태를 확인해 주세요."
  );
}

/** Upload voice note (webm/mpeg/mp4) */
export async function uploadAudioBlob(blob: Blob, filename: string): Promise<string> {
  const rawType = blob.type?.split(";")[0]?.trim() || "";
  const contentType = rawType.startsWith("audio/") ? rawType : "audio/webm";
  const file = new File([blob], filename, { type: contentType });

  const localBody = await localUpload(file, "audio");
  if (localBody.publicUrl) return localBody.publicUrl;

  const direct = await presignedUpload(file, filename, contentType, "audio");
  if ("publicUrl" in direct) return direct.publicUrl;

  throw new Error(localBody.error || direct.error || "음성 업로드에 실패했습니다.");
}
