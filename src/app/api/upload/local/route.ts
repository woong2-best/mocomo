import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { checkUploadRateLimit } from "@/lib/api-security";
import {
  validateFileType,
  ALLOWED_IMAGE,
  ALLOWED_VIDEO,
  ALLOWED_AUDIO,
  normalizeAudioMime,
} from "@/lib/storage";
import {
  isSupabaseStorageConfigured,
  uploadBufferToSupabase,
} from "@/lib/supabase-storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadLimit = await checkUploadRateLimit(session.user.id);
  if (uploadLimit) return uploadLimit;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const category = (form.get("category") as string) || "image";

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const allowed =
    category === "video" ? ALLOWED_VIDEO : category === "audio" ? ALLOWED_AUDIO : ALLOWED_IMAGE;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  let mime =
    file.type?.trim() ||
    (category === "video"
      ? "video/mp4"
      : category === "audio"
        ? "audio/mpeg"
        : "image/jpeg");

  const ext = safeName.split(".").pop()?.toLowerCase();

  if (category === "image") {
    if (!mime.startsWith("image/") || mime === "application/octet-stream") {
      const byExt: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        heic: "image/heic",
        heif: "image/heif",
      };
      mime = (ext && byExt[ext]) || "image/jpeg";
    }
  }

  if (category === "video") {
    if (!mime.startsWith("video/") || mime === "application/octet-stream") {
      const byExt: Record<string, string> = {
        mp4: "video/mp4",
        m4v: "video/mp4",
        webm: "video/webm",
        mov: "video/quicktime",
        qt: "video/quicktime",
        "3gp": "video/3gpp",
        "3gpp": "video/3gpp",
      };
      mime = (ext && byExt[ext]) || "video/mp4";
    }
  }

  if (category === "audio") {
    if (!mime.startsWith("audio/") || mime === "application/octet-stream") {
      const byExt: Record<string, string> = {
        webm: "audio/webm",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
        mp4: "audio/mp4",
        mp3: "audio/mpeg",
        mpeg: "audio/mpeg",
        wav: "audio/wav",
        aac: "audio/aac",
      };
      mime = (ext && byExt[ext]) || "audio/webm";
    }
    mime = normalizeAudioMime(mime);
  }

  if (!validateFileType(mime, allowed)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const maxSize =
    session.user.premiumTier === "PREMIUM" ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const cat = category === "video" ? "video" : category === "audio" ? "audio" : "image";

  if (isSupabaseStorageConfigured()) {
    const uploaded = await uploadBufferToSupabase(
      session.user.id,
      buffer,
      safeName,
      mime,
      cat
    );
    if ("publicUrl" in uploaded) {
      return NextResponse.json({ publicUrl: uploaded.publicUrl });
    }
    return NextResponse.json({ error: uploaded.error }, { status: 500 });
  }

  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "프로덕션 업로드 설정이 필요합니다. Vercel에 SUPABASE_SERVICE_ROLE_KEY를 추가하고 Supabase에서 Storage 버킷 SQL(섹션 L)을 실행해 주세요.",
      },
      { status: 503 }
    );
  }

  const relKey = `uploads/${session.user.id}/${Date.now()}-${safeName}`;
  const absPath = path.join(process.cwd(), "public", relKey);

  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buffer);

  return NextResponse.json({ publicUrl: `/${relKey}` });
}
