import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { appAlarmNotificationWhere } from "@/lib/app-alarm";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const where = appAlarmNotificationWhere(authResult.user.id);
  const [rows, unread] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { actor: { select: { id: true, username: true, image: true } } },
    }),
    db.notification.count({ where: { ...where, read: false } }),
  ]);

  return NextResponse.json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      actor: n.actor,
    })),
    unread,
  });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-notifications-read", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; all?: unknown };
  const where = appAlarmNotificationWhere(authResult.user.id);

  if (body.all === true) {
    await db.notification.updateMany({
      where: { ...where, read: false },
      data: { read: true },
    });
  } else if (typeof body.id === "string" && body.id.length > 0 && body.id.length <= 64) {
    await db.notification.updateMany({
      where: { ...where, id: body.id },
      data: { read: true },
    });
  } else {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const unread = await db.notification.count({ where: { ...where, read: false } });
  return NextResponse.json({ ok: true, unread });
}
