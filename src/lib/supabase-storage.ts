import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "mocomo-uploads";

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

export function storageObjectKey(
  userId: string,
  category: "image" | "video" | "audio",
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
  category: "image" | "video" | "audio"
): Promise<{ publicUrl: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { error: "Supabase Storage isn't configured." };
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

export async function createSupabaseSignedUpload(
  userId: string,
  filename: string,
  contentType: string,
  category: "image" | "video" | "audio"
): Promise<{ uploadUrl: string; publicUrl: string; token: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const key = storageObjectKey(userId, category, filename);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(key);
  if (error || !data?.signedUrl) return null;

  return {
    uploadUrl: data.signedUrl,
    publicUrl: publicStorageUrl(data.path ?? key),
    token: data.token,
  };
}
