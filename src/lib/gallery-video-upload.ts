/** 갤러리 영상 — 모바일 빈 MIME·MOV/MP4 대응 */

export function guessVideoMime(filename: string, reportedType?: string): string {
  const t = reportedType?.trim().toLowerCase() ?? "";
  if (t.startsWith("video/") && t !== "application/octet-stream") return t;

  const ext = filename.split(".").pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    qt: "video/quicktime",
    "3gp": "video/3gpp",
    "3gpp": "video/3gpp",
  };
  if (ext && byExt[ext]) return byExt[ext];
  return "video/mp4";
}

export function isGalleryVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  if (/\.(mp4|m4v|webm|mov|qt|3gp|3gpp)$/i.test(file.name)) return true;
  return false;
}

export function normalizeGalleryVideoFile(file: File): File {
  const stamp = Date.now();
  const rawName = file.name?.trim();
  const name =
    rawName && /\.[a-z0-9]+$/i.test(rawName)
      ? rawName
      : rawName
        ? `${rawName}.mp4`
        : `video-${stamp}.mp4`;
  const type = guessVideoMime(name, file.type);
  if (file.name === name && file.type === type) return file;
  return new File([file], name, { type, lastModified: file.lastModified });
}
