import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = process.env.S3_ACCESS_KEY_ID
  ? new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  _maxSize = 50 * 1024 * 1024
): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  if (!s3 || !process.env.S3_BUCKET_NAME) return null;
  const bucket = process.env.S3_BUCKET_NAME;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const publicUrl = process.env.S3_PUBLIC_URL
    ? `${process.env.S3_PUBLIC_URL}/${key}`
    : uploadUrl.split("?")[0];
  return { uploadUrl, publicUrl };
}

export function validateFileType(
  mime: string,
  allowed: string[]
): boolean {
  return allowed.some((a) => mime.startsWith(a) || mime === a);
}

export const ALLOWED_IMAGE = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
export const ALLOWED_VIDEO = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/3gpp",
  "video/mpeg",
];
export const ALLOWED_AUDIO = [
  "audio/mpeg",
  "audio/mp3",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
];

/** `audio/webm;codecs=opus` → `audio/webm` */
export function normalizeAudioMime(mime: string): string {
  const base = mime.split(";")[0]?.trim().toLowerCase() || "audio/webm";
  if (base === "audio/mp3") return "audio/mpeg";
  return base.startsWith("audio/") ? base : "audio/webm";
}
