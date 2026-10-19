import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminStepUp } from "@/lib/admin/access";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  completeCreatorPayoutRequest,
  rejectCreatorPayoutRequest,
  revealCreatorPayoutDestination,
} from "@/lib/creator-payout/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function adminError(e: unknown) {
  if (e instanceof AdminAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function validId(id: string) {
  return /^[a-z0-9]{8,40}$/i.test(id);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimitPublicApi(req, "admin-creator-payout", 30);
  if (limited) return limited;
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    txReference?: string;
    adminNote?: string;
  } | null;

  try {
    const actor = await requireAdminStepUp("settlements", {
      action: body?.action === "reveal" ? "VIEW_USER_PII" : "PAYOUT_PROCESS",
      targetType: "creator_payout_request",
      targetId: id,
    });

    if (body?.action === "complete") {
      const result = await completeCreatorPayoutRequest({
        actorId: actor.id,
        requestId: id,
        txReference: body.txReference ?? "",
        adminNote: body.adminNote,
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ ok: true });
    }

    if (body?.action === "reject") {
      const result = await rejectCreatorPayoutRequest({
        actorId: actor.id,
        requestId: id,
        adminNote: body.adminNote ?? "",
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    }

    if (body?.action === "reveal") {
      const request = await db.creatorPayoutRequest.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!request) return NextResponse.json({ error: "Payout request not found." }, { status: 404 });
      const result = await revealCreatorPayoutDestination(request.userId);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ destination: result.destination });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return adminError(e);
  }
}
