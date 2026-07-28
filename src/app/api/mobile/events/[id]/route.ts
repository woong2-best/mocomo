import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";

const publishedEventWhere = {
  endsAt: { gte: new Date() },
  OR: [
    { createdById: null },
    { registrationFeePaid: true, status: "PUBLISHED" as const },
  ],
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-events-detail", 60);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const event = await db.event.findFirst({
    where: { id, ...publishedEventWhere },
    include: {
      _count: { select: { participants: true } },
      createdBy: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
  }

  let joined = false;
  if (viewerId) {
    const p = await db.eventParticipant.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: viewerId } },
      select: { id: true },
    });
    joined = !!p;
  }

  return NextResponse.json({
    item: {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      imageUrl: event.imageUrl,
      prize: event.prize,
      linkUrl: event.linkUrl,
      videoUrl: event.videoUrl,
      participantCount: event._count.participants,
      joined,
      createdBy: event.createdBy
        ? {
            id: event.createdBy.id,
            username: event.createdBy.username,
            name: event.createdBy.name,
            image: event.createdBy.image,
          }
        : null,
    },
  });
}
