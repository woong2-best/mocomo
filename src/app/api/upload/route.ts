import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUploadRateLimit } from "@/lib/api-security";
import { getUploadPresignedUrl, validateFileType, ALLOWED_IMAGE, ALLOWED_VIDEO, ALLOWED_AUDIO } from "@/lib/storage";
import { createSupabaseSignedUpload } from "@/lib/supabase-storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadLimit = await checkUploadRateLimit(session.user.id);
  if (uploadLimit) return uploadLimit;

  const body = await req.json();
  const { filename, contentType, category } = body as {
    filename: string;
    contentType: string;
    category: "image" | "video" | "audio";
  };

  const allowed =
    category === "image"
      ? ALLOWED_IMAGE
      : category === "video"
        ? ALLOWED_VIDEO
        : ALLOWED_AUDIO;

  if (!validateFileType(contentType, allowed)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const maxSize =
    session.user.premiumTier === "PREMIUM" ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
  const key = `uploads/${session.user.id}/${Date.now()}-${filename}`;
  const result = await getUploadPresignedUrl(key, contentType, maxSize);
  if (result) return NextResponse.json(result);

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const supabaseUpload = await createSupabaseSignedUpload(
    session.user.id,
    safeFilename,
    contentType,
    category
  );
  if (supabaseUpload) {
    return NextResponse.json(supabaseUpload);
  }

  return NextResponse.json(
    {
      error: "Upload storage not configured",
      message:
        "S3_* 또는 SUPABASE_SERVICE_ROLE_KEY + Storage 버킷(scripts/supabase-fix-all.sql 섹션 L)을 설정해 주세요.",
    },
    { status: 503 }
  );
}
