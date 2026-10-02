import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdmin, isSupabaseStorageConfigured } from "@/lib/supabase-storage";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "mocomo-uploads";
const KYC_PREFIX = "kyc/";
export const KYC_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export function buildKycDocumentKey(userId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${KYC_PREFIX}${userId}/${Date.now()}-${safeName || "id.jpg"}`;
}

export function isKycDocumentKeyOwnedByUser(documentKey: string, userId: string): boolean {
  const expected = `${KYC_PREFIX}${userId}/`;
  return (
    documentKey.startsWith(expected) &&
    !documentKey.includes("..") &&
    documentKey.length <= 512
  );
}

function localKycAbsPath(documentKey: string): string {
  return path.join(process.cwd(), "data", "private", documentKey);
}

export async function uploadKycDocumentBuffer(input: {
  userId: string;
  buffer: Buffer;
  filename: string;
  contentType: string;
}): Promise<{ documentKey: string } | { error: string }> {
  const documentKey = buildKycDocumentKey(input.userId, input.filename);

  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: "Storage configuration error" };

    const { error } = await supabase.storage.from(BUCKET).upload(documentKey, input.buffer, {
      contentType: input.contentType,
      upsert: false,
    });
    if (error) {
      return { error: error.message || "Failed to upload ID image." };
    }
    return { documentKey };
  }

  const absPath = localKycAbsPath(documentKey);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, input.buffer);
  return { documentKey };
}

/** 관리자 예외 검수 — 단기 signed URL 또는 admin proxy 경로 */
export async function createKycDocumentViewUrl(
  documentKey: string,
  expiresSec = 300
): Promise<{ url: string } | { error: string }> {
  if (!documentKey.startsWith(KYC_PREFIX) || documentKey.includes("..")) {
    return { error: "Invalid document key." };
  }

  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: "Storage configuration error" };

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(documentKey, expiresSec);
    if (error || !data?.signedUrl) {
      return { error: error?.message || "Could not load ID image." };
    }
    return { url: data.signedUrl };
  }

  try {
    await readFile(localKycAbsPath(documentKey));
    return {
      url: `/api/admin/market/seller-kyc-document?key=${encodeURIComponent(documentKey)}`,
    };
  } catch {
    return { error: "ID image not found." };
  }
}

export async function readKycDocumentBuffer(
  documentKey: string
): Promise<{ buffer: Buffer; contentType: string } | { error: string }> {
  if (!documentKey.startsWith(KYC_PREFIX) || documentKey.includes("..")) {
    return { error: "Invalid document key." };
  }

  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: "Storage configuration error" };

    const { data, error } = await supabase.storage.from(BUCKET).download(documentKey);
    if (error || !data) {
      return { error: error?.message || "ID image not found." };
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = documentKey.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";
    return { buffer, contentType };
  }

  try {
    const buffer = await readFile(localKycAbsPath(documentKey));
    const ext = documentKey.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";
    return { buffer, contentType };
  } catch {
    return { error: "ID image not found." };
  }
}
