/** 편집기용 HTMLImageElement 로드 — data/blob URL은 crossOrigin 미설정 */
export function shouldUseCrossOrigin(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src?.trim()) {
      reject(new Error("EMPTY_IMAGE_SRC"));
      return;
    }
    const img = new window.Image();
    if (shouldUseCrossOrigin(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      void img.decode().then(() => resolve(img)).catch(() => resolve(img));
    };
    img.onerror = () => reject(new Error(`IMAGE_LOAD_FAILED:${src.slice(0, 48)}`));
    img.src = src;
  });
}

export async function readImageDimensions(src: string): Promise<{ width: number; height: number }> {
  const img = await loadHtmlImage(src);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (width <= 0 || height <= 0) {
    throw new Error("INVALID_IMAGE_DIMENSIONS");
  }
  return { width, height };
}

/** 원격·blob URL을 편집기에 안전하게 넣기 위한 data URL 정규화 */
export async function normalizeEditorImageSrc(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const res = await fetch(src);
  if (!res.ok) throw new Error("IMAGE_FETCH_FAILED");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
