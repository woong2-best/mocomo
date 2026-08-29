import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUploadRateLimit } from "@/lib/api-security";
import { ALLOWED_IMAGE, validateFileType } from "@/lib/storage";
import { validateBufferMime } from "@/lib/file-magic";
import {
  KYC_DOCUMENT_MAX_BYTES,
  uploadKycDocumentBuffer,
} from "@/lib/marketplace/kyc-document-storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadLimit = await checkUploadRateLimit(session.user.id);
  if (uploadLimit) return uploadLimit;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "파일을 선택해 주세요." }, { status: 400 });
  }

  if (file.size > KYC_DOCUMENT_MAX_BYTES) {
    return NextResponse.json(
      { error: "신분증 이미지는 10MB 이하만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.split(".").pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };

  let mime = file.type?.trim() || "";
  if (!mime.startsWith("image/") || mime === "application/octet-stream") {
    mime = (ext && byExt[ext]) || "image/jpeg";
  }

  if (!validateFileType(mime, ALLOWED_IMAGE)) {
    return NextResponse.json({ error: "JPEG·PNG·WEBP 이미지만 업로드할 수 있습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateBufferMime(buffer, mime, ALLOWED_IMAGE)) {
    return NextResponse.json({ error: "파일 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const uploaded = await uploadKycDocumentBuffer({
    userId: session.user.id,
    buffer,
    filename: safeName,
    contentType: mime,
  });

  if ("error" in uploaded) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 });
  }

  return NextResponse.json({ documentKey: uploaded.documentKey });
}
