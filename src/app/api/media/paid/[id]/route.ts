import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { fetchPaidOriginVideo } from "@/lib/paid-media-origin";
import { verifyPaidVideoAccess, WatermarkAccessError } from "@/lib/watermark/session/service";

export const dynamic = "force-dynamic";

function passthrough(origin: Awaited<ReturnType<typeof fetchPaidOriginVideo>>) {
  return new NextResponse(origin.body, {
    status: origin.status,
    headers: origin.headers,
  });
}

/** GET /api/media/paid/[id] — entitlement-gated progressive playback. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "paid-media-play", 120);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const media = await db.postMedia.findUnique({
    where: { id },
    select: {
      id: true,
      url: true,
      type: true,
      priceKrw: true,
      post: { select: { authorId: true } },
    },
  });
  if (!media || media.type !== "VIDEO") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((media.priceKrw ?? 0) <= 0) {
    return NextResponse.json({ error: "Not a paid video" }, { status: 400 });
  }

  // Author watches their own file through the same gate so the URL never
  // appears in the page, but they are not a leak suspect.
  if (session.user.id !== media.post.authorId) {
    try {
      await verifyPaidVideoAccess(session.user.id, id);
    } catch (e) {
      if (e instanceof WatermarkAccessError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  }

  const origin = await fetchPaidOriginVideo(media.url, req.headers.get("range"));
  return passthrough(origin);
}
