import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { fetchPaidOriginVideo } from "@/lib/paid-media-origin";
import { verifyPaidVideoAccess, WatermarkAccessError } from "@/lib/watermark/session/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/media/paid/episode/[id] — gated creator-episode video. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "paid-episode-play", 120);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const episode = await db.creatorEpisode.findUnique({
    where: { id },
    select: { id: true, videoUrl: true, price: true, authorId: true },
  });
  if (!episode?.videoUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (episode.price <= 0) {
    return NextResponse.json({ error: "Not a paid video" }, { status: 400 });
  }

  if (session.user.id !== episode.authorId) {
    try {
      await verifyPaidVideoAccess(session.user.id, id, "EPISODE");
    } catch (e) {
      if (e instanceof WatermarkAccessError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  }

  const origin = await fetchPaidOriginVideo(episode.videoUrl, req.headers.get("range"));
  return new NextResponse(origin.body, {
    status: origin.status,
    headers: origin.headers,
  });
}
