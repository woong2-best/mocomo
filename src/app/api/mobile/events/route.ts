import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getEvents } from "@/actions/events";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-events-list", 60);
  if (limited) return limited;

  await getMobileUserId(req);

  const events = await getEvents();
  return NextResponse.json({
    items: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description.slice(0, 200),
      type: e.type,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      imageUrl: e.imageUrl,
      prize: e.prize,
      participantCount: e._count.participants,
      createdBy: e.createdBy
        ? { username: e.createdBy.username, name: e.createdBy.name }
        : null,
    })),
  });
}
