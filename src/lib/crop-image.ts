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

/** Crop + optional rotation → JPEG/WebP blob sized for upload */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  options: {
    rotation?: number;
    maxWidth: number;
    maxHeight: number;
    mimeType?: "image/jpeg" | "image/webp";
    quality?: number;
  }
): Promise<Blob> {
  const rotation = options.rotation ?? 0;
  const mimeType = options.mimeType ?? "image/jpeg";
  const quality = options.quality ?? 0.9;

  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const rotRad = getRadianAngle(rotation);
  const bBoxWidth = Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
  const bBoxHeight = Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const cropped = document.createElement("canvas");
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) throw new Error("Canvas not supported");

  cropped.width = pixelCrop.width;
  cropped.height = pixelCrop.height;
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

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
