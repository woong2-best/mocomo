import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi } from "@/lib/api-security";
import { verifySessionEncoderRoundtrip } from "@/lib/watermark/decoder/roundtrip";
import { resolveWatermarkSession } from "@/lib/watermark/session/service";

export const dynamic = "force-dynamic";

/** GET /api/admin/watermark/roundtrip?sessionId= — encoder→detector self-test for one session. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "admin-watermark-roundtrip", 30);
  if (limited) return limited;

  try {
    await requireAdminPermission("reports", {
      action: "WATERMARK_ROUNDTRIP",
      targetType: "watermark_session",
    });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await resolveWatermarkSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const roundtrip = verifySessionEncoderRoundtrip({
    id: session.id,
    contentId: session.contentId,
    userId: session.userId,
    purchaseId: session.purchaseId,
    episodePurchaseId: session.episodePurchaseId,
    subscriptionId: session.subscriptionId,
    sessionNonce: session.sessionNonce,
    watermarkVersion: session.watermarkVersion,
    opaqueWatermarkId: session.opaqueWatermarkId,
  });

  return NextResponse.json({
    sessionId: session.id,
    contentId: session.contentId,
    roundtrip,
    message: roundtrip.ok
      ? "Encoder and detector agree for this session (synthetic frame)."
      : "Encoder/decoder mismatch for this session — browser capture would also fail.",
  });
}
