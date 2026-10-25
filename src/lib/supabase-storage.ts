import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "mocomo-uploads";

const MEDIA_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/webm",
  "audio/ogg",
] as const;

const MODEL_MIME = ["model/gltf-binary", "application/octet-stream"] as const;
const MODEL_MAX_BYTES = 32 * 1024 * 1024;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(getSupabaseAdmin() && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function publicStorageUrl(objectPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

export type StorageCategory = "image" | "video" | "audio" | "model";

export function storageObjectKey(
  userId: string,
  category: StorageCategory,
  filename: string
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${category}/${userId}/${Date.now()}-${safeName}`;
}

export async function uploadBufferToSupabase(
  userId: string,
  buffer: Buffer,
  filename: string,
  contentType: string,
  category: StorageCategory
): Promise<{ publicUrl: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { error: "Supabase Storage isn't configured." };
  }
  if (category === "model") {
    const ok = await ensureVrmUploadsAllowed();
    if (!ok) return { error: "Storage bucket missing. Run section L of scripts/supabase-fix-all.sql in the Supabase SQL Editor." };
  }

  const key = storageObjectKey(userId, category, filename);
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    if (error.message?.includes("Bucket not found")) {
      return {
        error:
          "Storage bucket missing. Run section L of scripts/supabase-fix-all.sql in the Supabase SQL Editor.",
      };
    }
    return { error: error.message || "Storage upload failed." };
  }

  return { publicUrl: publicStorageUrl(key) };
}

/** Bucket was created for photos/video only. VRM uploads 400 until these types are allowed. */
export async function ensureVrmUploadsAllowed(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (error) return false;
  const have = new Set(data?.allowedMimeTypes ?? []);
  const next = [...new Set([...MEDIA_MIME, ...have, ...MODEL_MIME])];
  const size = Math.max(data?.fileSizeLimit ?? 0, MODEL_MAX_BYTES);
  const mimeReady = MODEL_MIME.every((mime) => have.has(mime));
  if (mimeReady && (data?.fileSizeLimit ?? 0) >= MODEL_MAX_BYTES) return true;
  const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {
    public: data?.public ?? true,
    fileSizeLimit: size,
    allowedMimeTypes: next,
  });
  return !updateError;
}

export async function createSupabaseSignedUpload(
  userId: string,
  filename: string,
  contentType: string,
  category: StorageCategory
): Promise<{ uploadUrl: string; publicUrl: string; token: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  if (category === "model") {
    const ok = await ensureVrmUploadsAllowed();
    if (!ok) return null;
  }

  const key = storageObjectKey(userId, category, filename);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(key);
  if (error || !data?.signedUrl) return null;

  return {
    uploadUrl: data.signedUrl,
    publicUrl: publicStorageUrl(data.path ?? key),
    token: data.token,
  };
}

/** Object key for a public URL in this project's bucket, or null if it is not ours. */
export function publicUrlToObjectKey(url: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  let parsed: URL;
  let allowed: URL;
  try {
    parsed = new URL(url);
    allowed = new URL(base);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.host !== allowed.host) return null;
  const prefix = `/storage/v1/object/public/${BUCKET}/`;
  if (!parsed.pathname.startsWith(prefix)) return null;
  let key = "";
  try {
    key = decodeURIComponent(parsed.pathname.slice(prefix.length));
  } catch {
    return null;
  }
  if (!key || key.includes("..") || key.startsWith("/")) return null;
  return key;
}

export async function deletePublicStorageUrl(url: string): Promise<void> {
  const key = publicUrlToObjectKey(url);
  if (!key) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.storage.from(BUCKET).remove([key]);
  if (error) throw new Error(error.message || "Storage delete failed.");
}
