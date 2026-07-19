import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import {
  getSubscriptionsForViewer,
  isMediaContentLocked,
} from "@/lib/content-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-media", 60);
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const session = await auth();
  const viewerId = session?.user?.id;

  const post = await db.post.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      visibility: true,
      instantPurchasePriceKrw: true,
      media: {
        orderBy: { order: "asc" },
        select: { id: true, url: true, type: true, priceKrw: true },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const mediaIds = post.media.map((m) => m.id);
  const [purchasedIds, subs] = await Promise.all([
    getPurchasedPostMediaIds(viewerId, mediaIds),
    getSubscriptionsForViewer(viewerId, [post.authorId]),
  ]);

  const media = post.media.map((m) => {
    const { locked, lockReason, priceKrw } = isMediaContentLocked({
      viewerId,
      authorId: post.authorId,
      visibility: post.visibility,
      instantPurchasePriceKrw: post.instantPurchasePriceKrw,
      mediaPriceKrw: m.priceKrw,
      purchased: purchasedIds.has(m.id),
      subscription: subs.get(post.authorId) ?? null,
    });
    return {
      id: m.id,
      url: m.url,
      type: m.type,
      priceKrw: m.priceKrw ?? 0,
      locked,
      lockReason,
      instantPurchasePriceKrw: priceKrw,
    };
  });

  return NextResponse.json({ media, total: media.length });
}
