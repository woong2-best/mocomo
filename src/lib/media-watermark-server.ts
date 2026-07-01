import sharp from "sharp";
import { buildWatermarkSvg } from "@/lib/media-watermark";

/** 서버 업로드 시 이미지에 크레딧 라벨 합성 */
export async function applyImageWatermarkBuffer(
  input: Buffer,
  mime: string,
  label: string
): Promise<{ buffer: Buffer; mime: string }> {
  if (mime === "image/gif") {
    return { buffer: input, mime };
  }

  const image = sharp(input, { animated: false });
  const meta = await image.metadata();
  const width = meta.width ?? 1080;
  const height = meta.height ?? 1080;

  const overlay = Buffer.from(buildWatermarkSvg(width, height, label));
  const composited = image.composite([{ input: overlay, top: 0, left: 0 }]);

  if (mime === "image/png") {
    return { buffer: await composited.png({ compressionLevel: 8 }).toBuffer(), mime: "image/png" };
  }
  if (mime === "image/webp") {
    return { buffer: await composited.webp({ quality: 92 }).toBuffer(), mime: "image/webp" };
  }

  return { buffer: await composited.jpeg({ quality: 92 }).toBuffer(), mime: "image/jpeg" };
}
