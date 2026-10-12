import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getJwtSessionUser } from "@/lib/session-jwt";

export async function POST(req: NextRequest) {
  const user = await getJwtSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  try {
    await db.pushSubscription.upsert({
      where: { userId_endpoint: { userId: user.id, endpoint } },
      create: { userId: user.id, endpoint, p256dh, auth, userAgent },
      update: { p256dh, auth, userAgent },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getJwtSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  try {
    await db.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
