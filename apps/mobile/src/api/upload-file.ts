import * as FileSystem from "expo-file-system/legacy";
import { requestUpload } from "@/api/posts";
import { translate } from "@/i18n/runtime";
import { ensureLocalFileUri } from "@/lib/local-file-uri";

const VIDEO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/mp4",
  webm: "video/webm",
  "3gp": "video/3gpp",
  "3gpp": "video/3gpp",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
};

const ALLOWED_VIDEO_MIME = new Set(Object.values(VIDEO_MIME));

function normalizeUploadMime(filename: string, contentType: string, category: "image" | "video" | "audio") {
  const mime = contentType.split(";")[0]?.trim().toLowerCase() || "";
  if (category === "video") {
    if (ALLOWED_VIDEO_MIME.has(mime)) return mime;
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return VIDEO_MIME[ext] ?? "video/mp4";
  }
  return mime || contentType;
}

/**
 * Presigned PUT upload for local device files.
 * Do not use fetch(uri).blob() on RN — Android often sends an empty body and storage rejects it.
 */
export async function uploadLocalFile(opts: {
  uri: string;
  filename: string;
  contentType: string;
  category: "image" | "video" | "audio";
}): Promise<string> {
  const contentType = normalizeUploadMime(opts.filename, opts.contentType, opts.category);
  const localUri = await ensureLocalFileUri(opts.uri, opts.filename);
  const uploadMeta = await requestUpload({
    filename: opts.filename,
    contentType,
    category: opts.category,
  });
  const uploadUrl = uploadMeta.uploadUrl || uploadMeta.url;
  const publicUrl = uploadMeta.publicUrl || uploadMeta.url;
  if (!uploadUrl || !publicUrl) {
    throw new Error(translate("m.api.could_not_get_an_upload_url"));
  }

  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };
  if (uploadMeta.token) {
    headers.Authorization = `Bearer ${uploadMeta.token}`;
  }

  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(translate("m.api.file_upload_failed_status", { status: String(result.status) }));
  }

  return publicUrl;
}
