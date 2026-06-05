import type { Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

function getRadianAngle(degree: number) {
  return (degree * Math.PI) / 180;
}

/** 회전 후 바운딩 박스 크기 (react-easy-crop과 동일) */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export function normalizeRotation(degrees: number): number {
  let r = degrees % 360;
  if (r > 180) r -= 360;
  if (r < -180) r += 360;
  return Math.round(r * 10) / 10;
}

/** Cropper 미리보기 transform (뒤집기 포함) */
export function buildCropperTransform(
  crop: { x: number; y: number },
  rotation: number,
  zoom: number,
  flipH: boolean,
  flipV: boolean
): string {
  const scaleX = zoom * (flipH ? -1 : 1);
  const scaleY = zoom * (flipV ? -1 : 1);
  return `translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
}

/** Crop + rotation / flip → JPEG/WebP blob (react-easy-crop 권장 방식) */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  options: {
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    maxWidth: number;
    maxHeight: number;
    mimeType?: "image/jpeg" | "image/webp";
    quality?: number;
  }
): Promise<Blob> {
  const rotation = options.rotation ?? 0;
  const flipH = options.flipHorizontal ?? false;
  const flipV = options.flipVertical ?? false;
  const mimeType = options.mimeType ?? "image/jpeg";
  const quality = options.quality ?? 0.9;

  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  let cropX = pixelCrop.x;
  let cropY = pixelCrop.y;
  if (flipH) {
    cropX = bBoxWidth - pixelCrop.x - pixelCrop.width;
  }
  if (flipV) {
    cropY = bBoxHeight - pixelCrop.y - pixelCrop.height;
  }

  const w = Math.round(pixelCrop.width);
  const h = Math.round(pixelCrop.height);
  cropX = Math.max(0, Math.min(Math.round(cropX), bBoxWidth - w));
  cropY = Math.max(0, Math.min(Math.round(cropY), bBoxHeight - h));

  const data = ctx.getImageData(cropX, cropY, w, h);

  const cropped = document.createElement("canvas");
  cropped.width = w;
  cropped.height = h;
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) throw new Error("Canvas not supported");
  croppedCtx.putImageData(data, 0, 0);

  let { width, height } = cropped;
  const scale = Math.min(1, options.maxWidth / width, options.maxHeight / height);
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas not supported");
  outCtx.drawImage(cropped, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했습니다."))),
      mimeType,
      quality
    );
  });
}

export function readFileAsObjectUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
