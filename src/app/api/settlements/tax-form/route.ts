import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { TAX_FORM_MAX_BYTES, uploadTaxFormBuffer } from "@/lib/creator-payout/tax-storage";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "creator-tax-form", 5);
  if (limited) return limited;

  let userId: string;
  try {
    userId = (await requireAuth()).id;
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    }
    return NextResponse.json({ error: "This account cannot upload a tax form." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });

  const taxFormType = form.get("taxFormType");
  if (taxFormType !== "W9" && taxFormType !== "W8BEN") {
    return NextResponse.json({ error: "Choose W-9 or W-8BEN." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a tax form file." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > TAX_FORM_MAX_BYTES) {
    return NextResponse.json({ error: "Tax form must be under 4 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await uploadTaxFormBuffer({
    userId,
    buffer,
    contentType: file.type || "application/octet-stream",
  });
  if ("error" in stored) {
    return NextResponse.json({ error: stored.error }, { status: 400 });
  }

  await db.creatorTaxInfo.upsert({
    where: { userId },
    create: {
      userId,
      taxFormType,
      taxFormUrl: stored.documentKey,
      status: "PENDING",
    },
    update: {
      taxFormType,
      taxFormUrl: stored.documentKey,
      status: "PENDING",
      rejectionNote: null,
      reviewedById: null,
      reviewedAt: null,
    },
  });

  return NextResponse.json({ ok: true, status: "PENDING", taxFormType });
}
