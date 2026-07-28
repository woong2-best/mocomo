import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getSortedLiveGamesForNav } from "@/lib/minigames/registry";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-games", 60);
  if (limited) return limited;
  await getMobileUserId(req);

  const items = getSortedLiveGamesForNav().map((g) => ({
    id: g.id,
    name: g.name,
    href: g.href ?? null,
    description: g.description ?? null,
    category: g.category,
    status: g.status,
  }));

  return NextResponse.json({ items });
}
