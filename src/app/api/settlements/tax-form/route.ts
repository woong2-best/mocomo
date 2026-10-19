import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { safeLogWarn } from "@/lib/safe-log";
import { parseTaxFormPayload, w8benExpiresAt } from "@/lib/creator-payout/tax-form-input";
import { generateTaxFormPdf } from "@/lib/creator-payout/tax-pdf";
import { uploadTaxFormBuffer } from "@/lib/creator-payout/tax-storage";

export const maxDuration = 30;

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
    return NextResponse.json({ error: "This account cannot submit a tax form." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const signedOn = new Date();
  const prepared = parseTaxFormPayload(body, signedOn);
  if (!prepared) {
    return NextResponse.json(
      { error: "Complete every required field and sign the form." },
      { status: 400 },
    );
  }

  let pdf: Uint8Array;
  try {
    pdf = await generateTaxFormPdf(prepared);
  } catch (error) {
    safeLogWarn("tax-form-pdf", {
      userId,
      kind: prepared.kind,
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "Could not prepare the tax form." }, { status: 500 });
  }

  const stored = await uploadTaxFormBuffer({
    userId,
    buffer: Buffer.from(pdf),
    contentType: "application/pdf",
  });
  if ("error" in stored) {
    return NextResponse.json({ error: stored.error }, { status: 400 });
  }

  const expiresAt = prepared.kind === "W8BEN" ? w8benExpiresAt(signedOn) : null;
  await db.creatorTaxInfo.upsert({
    where: { userId },
    create: {
      userId,
      taxFormType: prepared.kind,
      taxFormUrl: stored.documentKey,
      status: "VERIFIED",
      countryCode: prepared.countryCode,
      expiresAt,
      reviewedAt: signedOn,
    },
    update: {
      taxFormType: prepared.kind,
      taxFormUrl: stored.documentKey,
      status: "VERIFIED",
      countryCode: prepared.countryCode,
      expiresAt,
      rejectionNote: null,
      reviewedById: null,
      reviewedAt: signedOn,
    },
  });

  return NextResponse.json({
    ok: true,
    status: "VERIFIED",
    taxFormType: prepared.kind,
    expiresAt: expiresAt?.toISOString() ?? null,
    countryCode: prepared.countryCode,
  });
}
