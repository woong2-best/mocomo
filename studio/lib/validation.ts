import {
  STUDIO_ALLOWED_EXTENSIONS,
  STUDIO_MAX_FILE_BYTES,
  STUDIO_MAX_POLYGONS,
  STUDIO_MAX_TEXTURE_SIZE,
} from "./constants";

export type ValidationIssue = { code: string; message: string; severity: "error" | "warn" };

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  polygonCount?: number;
  textureMaxSize?: number;
  fileSizeBytes: number;
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function validateUploadMeta(input: {
  filename: string;
  fileSizeBytes: number;
  polygonCount?: number | null;
  textureMaxSize?: number | null;
}): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ext = extOf(input.filename);

  if (!STUDIO_ALLOWED_EXTENSIONS.includes(ext as (typeof STUDIO_ALLOWED_EXTENSIONS)[number])) {
    issues.push({
      code: "format",
      message: "지원 형식: .glb, .gltf",
      severity: "error",
    });
  }

  if (input.fileSizeBytes > STUDIO_MAX_FILE_BYTES) {
    issues.push({
      code: "file_size",
      message: `파일 크기는 ${Math.round(STUDIO_MAX_FILE_BYTES / 1024 / 1024)}MB 이하여야 합니다`,
      severity: "error",
    });
  }

  if (input.fileSizeBytes < 12) {
    issues.push({
      code: "format",
      message: "파일이 손상되었거나 비어 있습니다",
      severity: "error",
    });
  }

  if (input.polygonCount != null && input.polygonCount > STUDIO_MAX_POLYGONS) {
    issues.push({
      code: "polygons",
      message: `폴리곤 수는 ${STUDIO_MAX_POLYGONS.toLocaleString()} 이하여야 합니다`,
      severity: "error",
    });
  }

  if (input.textureMaxSize != null && input.textureMaxSize > STUDIO_MAX_TEXTURE_SIZE) {
    issues.push({
      code: "texture",
      message: `텍스처 최대 변은 ${STUDIO_MAX_TEXTURE_SIZE}px 이하여야 합니다`,
      severity: "error",
    });
  }

  const hasError = issues.some((i) => i.severity === "error");
  return {
    ok: !hasError,
    issues,
    polygonCount: input.polygonCount ?? undefined,
    textureMaxSize: input.textureMaxSize ?? undefined,
    fileSizeBytes: input.fileSizeBytes,
  };
}

const SUSPICIOUS_GLTF_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /onerror\s*=/i,
  /data:text\/html/i,
  /vbscript:/i,
  /eval\s*\(/i,
];

function hasSuspiciousGltfContent(text: string): boolean {
  return SUSPICIOUS_GLTF_PATTERNS.some((pat) => pat.test(text));
}

/** GLB magic + JSON chunk 기본 검사 */
export function sniffGlb(buffer: Buffer): { valid: boolean; reason?: string } {
  if (buffer.length < 12) return { valid: false, reason: "too_small" };
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) return { valid: false, reason: "bad_magic" };
  const version = buffer.readUInt32LE(4);
  if (version !== 2) return { valid: false, reason: "bad_version" };
  return { valid: true };
}

/** GLB JSON 청크 악성 패턴 검사 */
export function scanGlbBuffer(buffer: Buffer): { safe: boolean; reason?: string } {
  const sniff = sniffGlb(buffer);
  if (!sniff.valid) return { safe: false, reason: sniff.reason };

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;
    const dataLength = chunkLength - 8;
    if (chunkLength < 8 || dataLength < 0 || offset + dataLength > buffer.length) break;

    if (chunkType === 0x4e4f534a) {
      const jsonStr = buffer.subarray(offset, offset + dataLength).toString("utf8");
      if (hasSuspiciousGltfContent(jsonStr)) {
        return { safe: false, reason: "suspicious_content" };
      }
    }
    offset += dataLength;
  }
  return { safe: true };
}

/** glTF JSON 텍스트 악성 패턴 검사 */
export function scanGltfText(text: string): { safe: boolean; reason?: string } {
  if (hasSuspiciousGltfContent(text)) {
    return { safe: false, reason: "suspicious_content" };
  }
  return { safe: true };
}
