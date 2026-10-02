import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import {
  getEventMapUserRecommendations,
  recommendationRowToMapPin,
} from "@/lib/event-map-recommendations";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-event-map-recommendations", 60);
  if (limited) return limited;

  try {
    const pins = await getEventMapUserRecommendations(300);
    return NextResponse.json(
      { ok: true, pins },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    console.error("[api/mobile/events/map/recommendations GET]", e);
    return NextResponse.json({ ok: true, pins: [] });
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-event-map-recommendation", 20);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const { title, description, lat, lng } = parsed.data;

  try {
    const count = await db.eventMapUserRecommendation.count({
      where: { userId: user.id },
    });
    if (count >= 30) {
      return NextResponse.json(
        { error: "추천 장소는 최대 30개까지 등록할 수 있습니다." },
        { status: 400 }
      );
    }

    const row = await db.eventMapUserRecommendation.create({
      data: {
        userId: user.id,
        title,
        description: description || null,
        lat,
        lng,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        lat: true,
        lng: true,
        createdAt: true,
        user: { select: { username: true, name: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      pin: recommendationRowToMapPin(row),
    });
  } catch (e) {
    console.error("[api/mobile/events/map/recommendations POST]", e);
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
