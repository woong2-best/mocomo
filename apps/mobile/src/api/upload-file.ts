import * as FileSystem from "expo-file-system/legacy";
import { requestUpload } from "@/api/posts";

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
  const uploadMeta = await requestUpload({
    filename: opts.filename,
    contentType: opts.contentType,
    category: opts.category,
  });
  const uploadUrl = uploadMeta.uploadUrl || uploadMeta.url;
  const publicUrl = uploadMeta.publicUrl || uploadMeta.url;
  if (!uploadUrl || !publicUrl) {
    throw new Error("업로드 URL을 받지 못했습니다.");
  }

  const headers: Record<string, string> = {
    "Content-Type": opts.contentType,
  };
  if (uploadMeta.token) {
    headers.Authorization = `Bearer ${uploadMeta.token}`;
  }

  const result = await FileSystem.uploadAsync(uploadUrl, opts.uri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`파일 업로드에 실패했습니다. (${result.status})`);
  }

  return publicUrl;
}
