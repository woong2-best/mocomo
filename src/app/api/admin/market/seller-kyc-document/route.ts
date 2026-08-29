import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readKycDocumentBuffer } from "@/lib/marketplace/kyc-document-storage";

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profileId")?.trim();
  const keyParam = req.nextUrl.searchParams.get("key")?.trim();

  let documentKey = keyParam;
  let auditTargetId = keyParam ?? profileId ?? "unknown";

  if (profileId) {
    try {
      await requireAdmin({
        action: "VIEW_USER_PII",
        targetType: "marketplace_seller",
        targetId: profileId,
      });
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await db.marketplaceSellerProfile.findUnique({
      where: { id: profileId },
      select: { kycDocumentKey: true },
    });
    documentKey = profile?.kycDocumentKey ?? undefined;
    auditTargetId = profileId;
  } else if (keyParam) {
    try {
      await requireAdmin({
        action: "VIEW_USER_PII",
        targetType: "marketplace_seller_kyc_document",
        targetId: keyParam,
      });
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!documentKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = await readKycDocumentBuffer(documentKey);
  if ("error" in doc) {
    return NextResponse.json({ error: doc.error, targetId: auditTargetId }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(doc.buffer), {
    headers: {
      "Content-Type": doc.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
