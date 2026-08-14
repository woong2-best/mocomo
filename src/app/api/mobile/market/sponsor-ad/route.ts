import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  listPaidSponsorEventsForMobile,
  pickHourlySponsorEvent,
} from "@/lib/marketplace/mobile-market-hub";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-market-sponsor-ad", 120);
  if (limited) return limited;

  const pool = await listPaidSponsorEventsForMobile();
  const event = pickHourlySponsorEvent(pool);

  return NextResponse.json({
    event: event
      ? {
          id: event.id,
          title: event.title,
          imageUrl: event.imageUrl,
          href: `/events/${event.id}`,
        }
      : null,
  });
}
