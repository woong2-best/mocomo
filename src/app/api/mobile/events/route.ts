import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getEvents } from "@/actions/events";

const getCachedMobileEvents = unstable_cache(
  async () => getEvents(),
  ["mobile-events-list-v1"],
  { revalidate: 30 }
);

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-events-list", 60);
  if (limited) return limited;

  const events = await getCachedMobileEvents();
  return NextResponse.json(
    {
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
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    }
  );
}
