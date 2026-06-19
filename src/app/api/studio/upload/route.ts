import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSupabaseAdmin, publicStorageUrl, isSupabaseStorageConfigured } from "@/lib/supabase-storage";
import { STUDIO_MAX_FILE_BYTES } from "@/studio/lib/constants";
import { validateUploadMeta, sniffGlb } from "@/studio/lib/validation";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "mocomo-uploads";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const assetId = String(form.get("assetId") ?? "");

  if (!file || !assetId) {
    return NextResponse.json({ error: "file and assetId required" }, { status: 400 });
  }

  const asset = await db.studioAsset.findFirst({
    where: { id: assetId, creatorId: session.user.id },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const polygonCount = form.get("polygonCount") ? Number(form.get("polygonCount")) : undefined;
  const textureMaxSize = form.get("textureMaxSize") ? Number(form.get("textureMaxSize")) : undefined;

  const validation = validateUploadMeta({
    filename: file.name,
    fileSizeBytes: file.size,
    polygonCount,
    textureMaxSize,
  });
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.issues.find((i) => i.severity === "error")?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  if (file.size > STUDIO_MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.toLowerCase();
  if (ext.endsWith(".glb")) {
    const sniff = sniffGlb(buffer);
    if (!sniff.valid) {
      return NextResponse.json({ error: "Invalid GLB file" }, { status: 400 });
    }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const mime = ext.endsWith(".gltf") ? "model/gltf+json" : "model/gltf-binary";
  const key = `studio/${session.user.id}/${Date.now()}-${safeName}`;

  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ publicUrl: publicStorageUrl(key) });
  }

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const relKey = `uploads/studio/${session.user.id}/${Date.now()}-${safeName}`;
  const absPath = path.join(process.cwd(), "public", relKey);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buffer);
  return NextResponse.json({ publicUrl: `/${relKey}` });
}
