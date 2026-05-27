import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { checkUploadRateLimit } from "@/lib/api-security";
import { validateFileType, ALLOWED_IMAGE, ALLOWED_VIDEO, ALLOWED_AUDIO } from "@/lib/storage";

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

  if (!validateFileType(file.type, allowed)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const maxSize =
    session.user.premiumTier === "PREMIUM" ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const relKey = `uploads/${session.user.id}/${Date.now()}-${safeName}`;
  const absPath = path.join(process.cwd(), "public", relKey);

  await mkdir(path.dirname(absPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  return NextResponse.json({ publicUrl: `/${relKey}` });
}
