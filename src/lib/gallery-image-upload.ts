/** 갤러리에서 고른 파일 — 모바일 빈 MIME·HEIC 대응 */

export function guessImageMime(filename: string, reportedType?: string): string {
  const t = reportedType?.trim().toLowerCase() ?? "";
  if (t.startsWith("image/") && t !== "application/octet-stream") return t;

  const ext = filename.split(".").pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    bmp: "image/bmp",
  };
  if (ext && byExt[ext]) return byExt[ext];
  return "image/jpeg";
}

export function normalizeGalleryImageFile(file: File): File {
  const stamp = Date.now();
  const rawName = file.name?.trim();
  const name =
    rawName && rawName.includes(".")
      ? rawName
      : rawName
        ? `${rawName}.jpg`
        : `photo-${stamp}.jpg`;
  const type = guessImageMime(name, file.type);
  if (file.name === name && file.type === type) return file;
  return new File([file], name, { type, lastModified: file.lastModified });
}

function sourceDimensions(source: CanvasImageSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  if (source instanceof ImageBitmap) {
    return { width: source.width, height: source.height };
  }
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }
  return { width: 0, height: 0 };
}

async function drawToJpegFile(source: CanvasImageSource, outName: string): Promise<File> {
  const maxSide = 1920;
  let { width, height } = sourceDimensions(source);
  if (!width || !height) throw new Error("Invalid image dimensions");

  if (width > maxSide || height > maxSide) {
    const scale = maxSide / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(source, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("JPEG 변환 실패"))),
      "image/jpeg",
      0.88
    );
  });
  return new File([blob], outName, { type: "image/jpeg", lastModified: Date.now() });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = url;
  });
}

/** 업로드·미리보기용 JPEG (갤러리 HEIC/빈 타입 포함) */
export async function fileToUploadableJpeg(file: File): Promise<File> {
  const normalized = normalizeGalleryImageFile(file);
  const outName = normalized.name.replace(/\.[^.]+$/i, "") + ".jpg";

  try {
    const bitmap = await createImageBitmap(normalized);
    try {
      return await drawToJpegFile(bitmap, outName);
    } finally {
      bitmap.close();
    }
  } catch {
    try {
      const img = await loadImageElement(normalized);
      return await drawToJpegFile(img, outName);
    } catch {
      const mime = guessImageMime(outName, normalized.type);
      if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") {
        return new File([normalized], outName, {
          type: mime,
          lastModified: normalized.lastModified,
        });
      }
      throw new Error("이 사진 형식은 지원되지 않습니다. 다른 사진을 선택해 주세요.");
    }
  }
}

/** JPEG 변환 실패 시 원본 그대로 업로드 시도 (HEIC 등) */
export async function prepareGalleryImageForUpload(file: File): Promise<File> {
  try {
    return await fileToUploadableJpeg(file);
  } catch {
    const normalized = normalizeGalleryImageFile(file);
    if (normalized.size <= 0) {
      throw new Error("빈 파일입니다. 다른 사진을 선택해 주세요.");
    }
    return normalized;
  }
}

export function isGalleryImageFile(file: File, imageOnlyPicker: boolean): boolean {
  const type = file.type?.trim().toLowerCase() ?? "";
  if (type.startsWith("image/")) return true;
  if (type.startsWith("video/")) return false;
  if (/\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name)) return true;
  if (imageOnlyPicker && file.size > 0) {
    if (!type || type === "application/octet-stream") return true;
    if (type.includes("image") || type.endsWith("+jpg") || type.endsWith("+jpeg")) return true;
  }
  return false;
}
