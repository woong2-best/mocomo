import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pickSponsorEvent,
  SPONSOR_ROTATION_COOKIE,
  type SponsorEventCandidate,
} from "@/lib/sponsor-event-rotation";

const sponsorEventWhere = {
  endsAt: { gte: new Date() },
  createdById: { not: null },
  registrationFeePaid: true,
  status: "PUBLISHED" as const,
  imageUrl: { not: null },
};

export async function GET() {
  try {
    const rows = await db.event.findMany({
      where: sponsorEventWhere,
      select: { id: true, title: true, imageUrl: true },
      orderBy: { startsAt: "asc" },
      take: 60,
    });

    const pool: SponsorEventCandidate[] = rows
      .filter((e): e is typeof e & { imageUrl: string } => !!e.imageUrl?.trim())
      .map((e) => ({ id: e.id, title: e.title, imageUrl: e.imageUrl }));

    const cookieStore = await cookies();
    const raw = cookieStore.get(SPONSOR_ROTATION_COOKIE)?.value;
    const { event, state } = pickSponsorEvent(pool, raw);

    const res = NextResponse.json({ ok: true, event });
    res.cookies.set(SPONSOR_ROTATION_COOKIE, JSON.stringify(state), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    console.error("[api/events/sponsor-spot]", e);
    return NextResponse.json({ ok: true, event: null });
  }
}
