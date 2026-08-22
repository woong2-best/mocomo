import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { fetchPaidOriginVideo } from "@/lib/paid-media-origin";
import { clampPaidPreviewRange } from "@/lib/paid-media-playback";

export const dynamic = "force-dynamic";

function passthrough(origin: Awaited<ReturnType<typeof fetchPaidOriginVideo>>) {
  return new NextResponse(origin.body, {
    status: origin.status,
    headers: origin.headers,
  });
}

/**
 * GET /api/media/paid/[id]/preview
 * Locked teaser only — no purchase required, origin URL never leaves the server.
 * Videos are byte-capped; images are downscaled so the full file is not leaked.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "paid-media-preview", 60);
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const media = await db.postMedia.findUnique({
    where: { id },
    select: { id: true, url: true, type: true, priceKrw: true },
  });
  if (!media || (media.type !== "VIDEO" && media.type !== "IMAGE")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((media.priceKrw ?? 0) <= 0) {
    return NextResponse.json({ error: "Not paid media" }, { status: 400 });
  }

  if (media.type === "IMAGE") {
    const origin = await fetchPaidOriginVideo(media.url, null);
    if (!origin.body) {
      return NextResponse.json({ error: "Preview unavailable" }, { status: 502 });
    }
    const buf = Buffer.from(await new Response(origin.body).arrayBuffer());
    const sharp = (await import("sharp")).default;
    const preview = await sharp(buf)
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .blur(36)
      .jpeg({ quality: 48 })
      .toBuffer();
    return new NextResponse(new Uint8Array(preview), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=120",
      },
    });
  }

  const origin = await fetchPaidOriginVideo(
    media.url,
    clampPaidPreviewRange(req.headers.get("range"))
  );
  origin.headers.set("Cache-Control", "private, max-age=60");
  return passthrough(origin);
}
