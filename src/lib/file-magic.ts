import { validateFileType } from "@/lib/storage";

function startsWith(buf: Buffer, sig: number[] | string, offset = 0): boolean {
  if (typeof sig === "string") {
    return buf.length >= offset + sig.length && buf.subarray(offset, offset + sig.length).toString("ascii") === sig;
  }
  if (buf.length < offset + sig.length) return false;
  return sig.every((b, i) => buf[offset + i] === b);
}

/** 파일 헤더(매직 바이트)로 MIME 추정 — 클라이언트 선언값 검증용 */
export function sniffMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 4) return null;

  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(buf, "GIF87a") || startsWith(buf, "GIF89a")) return "image/gif";
  if (startsWith(buf, "RIFF") && buf.length >= 12 && startsWith(buf, "WEBP", 8)) {
    return "image/webp";
  }

  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) {
    const head = buf.subarray(0, Math.min(buf.length, 64)).toString("binary");
    if (head.includes("webm")) return "video/webm";
    return "audio/webm";
  }

  if (buf.length >= 12 && startsWith(buf, "ftyp", 4)) {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }

  if (startsWith(buf, "ID3")) return "audio/mpeg";
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (startsWith(buf, "OggS")) return "audio/ogg";
  if (startsWith(buf, "fLaC")) return "audio/flac";

  return null;
}

function mimeFamily(mime: string): string {
  return mime.split(";")[0]?.trim().split("/")[0]?.toLowerCase() ?? "";
}

/** 선언 MIME과 매직 바이트가 일치하는지 검증 */
export function validateBufferMime(
  buf: Buffer,
  declaredMime: string,
  allowed: string[]
): boolean {
  const sniffed = sniffMimeFromBuffer(buf);
  if (!sniffed) return false;
  if (!validateFileType(sniffed, allowed)) return false;

  const declared = declaredMime.split(";")[0]?.trim().toLowerCase() ?? "";
  const detected = sniffed.split(";")[0]?.trim().toLowerCase() ?? "";
  if (declared === detected) return true;

  return mimeFamily(declared) === mimeFamily(detected);
}
