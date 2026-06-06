import { guessImageMime } from "@/lib/gallery-image-upload";
import { guessVideoMime } from "@/lib/gallery-video-upload";

/** Upload image via server (Supabase Storage / disk), then S3 presigned fallback */
export async function uploadImageBlob(blob: Blob, filename: string): Promise<string> {
  const contentType =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : guessImageMime(filename, blob.type);
  const file = new File([blob], filename, { type: contentType });

  const form = new FormData();
  form.set("file", file);
  form.set("category", "image");
  const localRes = await fetch("/api/upload/local", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const localBody = (await localRes.json().catch(() => ({}))) as {
    publicUrl?: string;
    error?: string;
  };
  if (localRes.ok && localBody.publicUrl) return localBody.publicUrl;

  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, category: "image" }),
    credentials: "include",
  });

  if (presignRes.ok) {
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
      throw new Error(
        localBody.error || "클라우드 업로드에 실패했습니다. 로그인 상태를 확인해 주세요."
      );
    }
    return publicUrl;
  }

  throw new Error(
    localBody.error ||
      (await presignRes.json().catch(() => ({})) as { message?: string }).message ||
      "이미지 업로드에 실패했습니다."
  );
}

/** Upload video — Supabase/local 우선, presigned 폴백 */
export async function uploadVideoBlob(blob: Blob, filename: string): Promise<string> {
  const contentType = guessVideoMime(filename, blob.type);
  const file = new File([blob], filename, { type: contentType });

  const form = new FormData();
  form.set("file", file);
  form.set("category", "video");
  const localRes = await fetch("/api/upload/local", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const localBody = (await localRes.json().catch(() => ({}))) as {
    publicUrl?: string;
    error?: string;
  };
  if (localRes.ok && localBody.publicUrl) return localBody.publicUrl;

  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, category: "video" }),
    credentials: "include",
  });

  if (presignRes.ok) {
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
      throw new Error(
        localBody.error || "영상 업로드에 실패했습니다. 로그인·용량(25MB)을 확인해 주세요."
      );
    }
    return publicUrl;
  }

  throw new Error(
    localBody.error ||
      (await presignRes.json().catch(() => ({})) as { message?: string }).message ||
      "영상 업로드에 실패했습니다."
  );
}

/** Upload voice note (webm/mpeg/mp4) */
export async function uploadAudioBlob(blob: Blob, filename: string): Promise<string> {
  const rawType = blob.type?.split(";")[0]?.trim() || "";
  const contentType = rawType.startsWith("audio/") ? rawType : "audio/webm";
  const file = new File([blob], filename, { type: contentType });

  const form = new FormData();
  form.set("file", file);
  form.set("category", "audio");
  const localRes = await fetch("/api/upload/local", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const localBody = (await localRes.json().catch(() => ({}))) as {
    publicUrl?: string;
    error?: string;
  };
  if (localRes.ok && localBody.publicUrl) return localBody.publicUrl;

  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, category: "audio" }),
    credentials: "include",
  });

  if (presignRes.ok) {
    const { uploadUrl, publicUrl, token } = (await presignRes.json()) as {
      uploadUrl: string;
      publicUrl: string;
      token?: string;
    };
    const headers: Record<string, string> = { "Content-Type": contentType };
    if (token) headers.Authorization = `Bearer ${token}`;
    const put = await fetch(uploadUrl, { method: "PUT", body: file, headers });
    if (!put.ok) {
      throw new Error(
        localBody.error || "음성 업로드에 실패했습니다. 로그인·Storage 설정을 확인해 주세요."
      );
    }
    return publicUrl;
  }

  const presignBody = (await presignRes.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  throw new Error(
    localBody.error || presignBody.error || presignBody.message || "음성 업로드에 실패했습니다."
  );
}
