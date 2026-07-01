import { guessImageMime } from "@/lib/gallery-image-upload";
import { guessVideoMime } from "@/lib/gallery-video-upload";
import { applyImageWatermarkBlob } from "@/lib/media-watermark-canvas";
import { watermarkVideoBlob } from "@/lib/video-trim";
import { DIRECT_UPLOAD_THRESHOLD } from "@/lib/upload-limits";

export type UploadMediaOptions = {
  /** 게시물용 — @username · site 크레딧 라벨 자동 합성 */
  watermarkLabel?: string;
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

async function presignedUpload(
  file: File,
  filename: string,
  contentType: string,
  category: "image" | "video" | "audio"
): Promise<string | null> {
  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, category }),
    credentials: "include",
  });

  if (!presignRes.ok) return null;

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

  if (!put.ok) return null;
  return publicUrl;
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
  }
  const localRes = await fetch("/api/upload/local", {
    method: "POST",
    body: form,
    credentials: "include",
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
  if (!opts?.watermarkLabel) return file;
  if (category === "image") {
    const blob = await applyImageWatermarkBlob(file, opts.watermarkLabel);
    const mime = blob.type || file.type || "image/jpeg";
    return new File([blob], file.name.replace(/\.\w+$/, "") + (mime.includes("png") ? ".png" : ".jpg"), {
      type: mime,
    });
  }
  if (category === "video") {
    const blob = await watermarkVideoBlob(file, opts.watermarkLabel);
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
  if (direct) return direct;

  throw new Error(localBody.error || "이미지 업로드에 실패했습니다.");
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
    if (direct) return direct;
  }

  const localBody = await localUpload(file, "video", opts);
  if (localBody.publicUrl) return localBody.publicUrl;

  const direct = await presignedUpload(file, file.name, file.type || contentType, "video");
  if (direct) return direct;

  throw new Error(
    localBody.error ||
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
  if (direct) return direct;

  throw new Error(localBody.error || "음성 업로드에 실패했습니다.");
}
