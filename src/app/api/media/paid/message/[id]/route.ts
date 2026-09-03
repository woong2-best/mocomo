import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { fetchPaidOriginVideo } from "@/lib/paid-media-origin";
import { verifyPaidVideoAccess, WatermarkAccessError } from "@/lib/watermark/session/service";
import { getWatermarkViewerUserId } from "@/lib/watermark/request-auth";

export const dynamic = "force-dynamic";

/** GET /api/media/paid/message/[id] — entitlement-gated paid DM photo/video. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "paid-message-media-play", 120);
  if (limited) return limited;

  const userId = await getWatermarkViewerUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const attachment = await db.messageAttachment.findUnique({
    where: { id },
    select: {
      id: true,
      url: true,
      type: true,
      priceKrw: true,
      message: { select: { senderId: true } },
    },
  });
  if (!attachment || (attachment.type !== "VIDEO" && attachment.type !== "IMAGE")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((attachment.priceKrw ?? 0) <= 0) {
    return NextResponse.json({ error: "Not paid media" }, { status: 400 });
  }

  // The sender streams their own file through the same gate so the origin URL
  // never reaches the page, but they are not a leak suspect.
  if (userId !== attachment.message.senderId) {
    try {
      await verifyPaidVideoAccess(userId, id, "MESSAGE_ATTACHMENT");
    } catch (e) {
      if (e instanceof WatermarkAccessError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  }

  const origin = await fetchPaidOriginVideo(
    attachment.url,
    req.headers.get("range"),
    attachment.type === "IMAGE" ? "image/jpeg" : "video/mp4"
  );
  return new NextResponse(origin.body, {
    status: origin.status,
    headers: origin.headers,
  });
}
