import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminStepUp } from "@/lib/admin/access";
import { rateLimitPublicApi } from "@/lib/api-security";
import { reviewCreatorTaxForm } from "@/lib/creator-payout/admin";
import { readTaxFormBuffer } from "@/lib/creator-payout/tax-storage";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ userId: string }> };

function adminError(e: unknown) {
  if (e instanceof AdminAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function validId(id: string) {
  return /^[a-z0-9]{8,40}$/i.test(id);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimitPublicApi(req, "admin-creator-tax-file", 20);
  if (limited) return limited;
  const { userId } = await ctx.params;
  if (!validId(userId)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    await requireAdminStepUp("settlements", {
      action: "VIEW_USER_PII",
      targetType: "creator_tax_form",
      targetId: userId,
    });
  } catch (e) {
    return adminError(e);
  }

  const tax = await db.creatorTaxInfo.findUnique({
    where: { userId },
    select: { taxFormUrl: true },
  });
  if (!tax) return NextResponse.json({ error: "Tax form not found." }, { status: 404 });
  const file = await readTaxFormBuffer(tax.taxFormUrl);
  if ("error" in file) return NextResponse.json({ error: file.error }, { status: 404 });

  const ext = file.contentType === "application/pdf" ? "pdf" : file.contentType === "image/png" ? "png" : "jpg";
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="tax-form.${ext}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimitPublicApi(req, "admin-creator-tax-review", 20);
  if (limited) return limited;
  const { userId } = await ctx.params;
  if (!validId(userId)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    decision?: string;
    rejectionNote?: string;
  } | null;
  if (body?.decision !== "VERIFIED" && body?.decision !== "REJECTED") {
    return NextResponse.json({ error: "Choose verify or reject." }, { status: 400 });
  }

  try {
    const actor = await requireAdminStepUp("settlements", {
      action: "PAYOUT_PROCESS",
      targetType: "creator_tax_form",
      targetId: userId,
      metadata: { decision: body.decision },
    });
    const result = await reviewCreatorTaxForm({
      actorId: actor.id,
      userId,
      decision: body.decision,
      rejectionNote: body.rejectionNote,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return adminError(e);
  }
}
