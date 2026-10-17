import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { getCreatorStudio } from "@/lib/creator-studio";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const limited = await rateLimitPublicApi(req, "mobile-studio", 60);
  if (limited) return limited;
  const { id } = await ctx.params;
  const studio = await getCreatorStudio(id);
  if (!studio) return NextResponse.json({ error: "Studio not found." }, { status: 404 });
  const viewerId = await getMobileUserId(req);
  const mine = viewerId
    ? await db.digitalCommission.findFirst({
        where: {
          studioId: id,
          buyerId: viewerId,
          status: { in: ["ACCEPTED", "DISPUTED", "LATE_CANCEL"] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, listingId: true, roomId: true, estimatedDays: true, createdAt: true },
      })
    : null;
  return NextResponse.json({
    studio,
    myOrder: mine
      ? {
          id: mine.id,
          status: mine.status,
          listingId: mine.listingId,
          roomId: mine.roomId,
          lateCancel: mine.status === "ACCEPTED" || mine.status === "DISPUTED",
        }
      : null,
  });
}
