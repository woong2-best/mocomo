import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { sniffMimeFromBuffer } from "@/lib/file-magic";
import { safeLogWarn } from "@/lib/safe-log";
import {
  ensureTaxPdfUploadsAllowed,
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
} from "@/lib/supabase-storage";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "mocomo-uploads";
const TAX_PREFIX = "tax-forms/";
export const TAX_FORM_MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED = ["application/pdf", "image/jpeg", "image/png"] as const;

function extensionFor(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  return "jpg";
}

export function isTaxFormKeyOwnedByUser(documentKey: string, userId: string): boolean {
  const expected = `${TAX_PREFIX}${userId}/`;
  return documentKey.startsWith(expected) && !documentKey.includes("..") && documentKey.length <= 180;
}

function localAbsPath(documentKey: string): string {
  return path.join(process.cwd(), "data", "private", documentKey);
}

export function inspectTaxFormUpload(buffer: Buffer, declaredMime: string): { mime: string } | { error: string } {
  if (buffer.length < 8 || buffer.length > TAX_FORM_MAX_BYTES) {
    return { error: "Tax form must be a PDF, JPEG, or PNG under 4 MB." };
  }
  const declared = declaredMime.split(";")[0]?.trim().toLowerCase() ?? "";
  const sniffed = sniffMimeFromBuffer(buffer);
  if (!sniffed || !ALLOWED.includes(sniffed as (typeof ALLOWED)[number])) {
    return { error: "Tax form must be a real PDF, JPEG, or PNG." };
  }
  if (declared && declared !== "application/octet-stream" && declared !== sniffed) {
    return { error: "Tax form must be a real PDF, JPEG, or PNG." };
  }
  return { mime: sniffed };
}

export async function uploadTaxFormBuffer(input: {
  userId: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ documentKey: string } | { error: string }> {
  const inspected = inspectTaxFormUpload(input.buffer, input.contentType);
  if ("error" in inspected) return inspected;

  const documentKey = `${TAX_PREFIX}${input.userId}/${randomUUID()}.${extensionFor(inspected.mime)}`;

  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: "Storage configuration error" };
    const pdfAllowed = await ensureTaxPdfUploadsAllowed();
    if (!pdfAllowed) {
      safeLogWarn("tax-form-storage", { reason: "pdf-mime-not-allowed" });
      return { error: "Could not store the tax form." };
    }
    const { error } = await supabase.storage.from(BUCKET).upload(documentKey, input.buffer, {
      contentType: inspected.mime,
      upsert: false,
    });
    if (error) {
      safeLogWarn("tax-form-storage", { reason: (error.message ?? "upload").slice(0, 80) });
      return { error: "Could not store the tax form." };
    }
    return { documentKey };
  }

  const absPath = localAbsPath(documentKey);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, input.buffer);
  return { documentKey };
}

export async function readTaxFormBuffer(
  documentKey: string,
): Promise<{ buffer: Buffer; contentType: string } | { error: string }> {
  if (!documentKey.startsWith(TAX_PREFIX) || documentKey.includes("..")) {
    return { error: "Invalid document key." };
  }
  const ext = documentKey.split(".").pop()?.toLowerCase();
  const contentType = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";

  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: "Storage configuration error" };
    const { data, error } = await supabase.storage.from(BUCKET).download(documentKey);
    if (error || !data) return { error: "Tax form not found." };
    return { buffer: Buffer.from(await data.arrayBuffer()), contentType };
  }

  try {
    return { buffer: await readFile(localAbsPath(documentKey)), contentType };
  } catch {
    return { error: "Tax form not found." };
  }
}
