import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listSponsorSpotPool } from "@/lib/sponsor-spot-server";
import {
  pickSponsorEvent,
  SPONSOR_ROTATION_COOKIE,
} from "@/lib/sponsor-event-rotation";

export async function GET() {
  try {
    const pool = await listSponsorSpotPool();
    const cookieStore = await cookies();
    const raw = cookieStore.get(SPONSOR_ROTATION_COOKIE)?.value;
    const { event: picked, state } = pickSponsorEvent(
      pool.map((e) => ({
        id: e.id,
        title: e.title,
        imageUrl: e.imageUrl,
        linkUrl: e.linkUrl,
      })),
      raw
    );
    const event = picked ? (pool.find((row) => row.id === picked.id) ?? picked) : null;

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
