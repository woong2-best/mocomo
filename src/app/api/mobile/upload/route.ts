import { NextRequest, NextResponse } from "next/server";
import { checkUploadRateLimit } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  getUploadPresignedUrl,
  validateFileType,
  ALLOWED_IMAGE,
  ALLOWED_VIDEO,
  ALLOWED_AUDIO,
  normalizeAudioMime,
} from "@/lib/storage";
import { createSupabaseSignedUpload } from "@/lib/supabase-storage";
import { getUploadMaxBytes } from "@/lib/upload-limits";

export async function POST(req: NextRequest) {
  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const uploadLimit = await checkUploadRateLimit(user.id);
  if (uploadLimit) return uploadLimit;

  let body: { filename?: string; contentType?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { filename, contentType, category } = body as {
    filename: string;
    contentType: string;
    category: "image" | "video" | "audio";
  };

  if (!filename || !contentType || !category) {
    return NextResponse.json({ error: "filename, contentType, category가 필요합니다." }, { status: 400 });
  }

  const allowed =
    category === "image"
      ? ALLOWED_IMAGE
      : category === "video"
        ? ALLOWED_VIDEO
        : ALLOWED_AUDIO;

  const mime =
    category === "audio"
      ? normalizeAudioMime(contentType)
      : contentType.split(";")[0]?.trim() || contentType;

  if (!validateFileType(mime, allowed)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const maxSize = getUploadMaxBytes(user.premiumTier, category);
  const key = `uploads/${user.id}/${Date.now()}-${filename}`;
  const result = await getUploadPresignedUrl(key, mime, maxSize);
  if (result) return NextResponse.json(result);

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const supabaseUpload = await createSupabaseSignedUpload(
    user.id,
    safeFilename,
    mime,
    category
  );
  if (supabaseUpload) {
    return NextResponse.json(supabaseUpload);
  }

  return NextResponse.json(
    { error: "Upload storage not configured" },
    { status: 503 }
  );
}
