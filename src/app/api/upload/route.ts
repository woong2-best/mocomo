import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUploadRateLimit } from "@/lib/api-security";
import { getUploadPresignedUrl, validateFileType, ALLOWED_IMAGE, ALLOWED_VIDEO, ALLOWED_AUDIO } from "@/lib/storage";

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

  if (!result) {
    return NextResponse.json(
      {
        error: "S3 not configured",
        message: "S3_* 환경 변수를 설정하거나 POST /api/upload/local 로 업로드하세요.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(result);
}
