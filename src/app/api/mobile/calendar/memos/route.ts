import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { parseDateKey } from "@/lib/calendar/kr-calendar";
import { getCalendarMemosForMonth } from "@/lib/calendar/memos-with-schedule";

const BODY_MAX = 2000;

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-calendar-memos-get", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  if (
    !Number.isInteger(year) ||
    year < 1970 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }

  const { memos, scheduleKeys, scheduleWeekdays, scheduleTime, scheduleNote } =
    await getCalendarMemosForMonth(auth.user.id, year, month);

  return NextResponse.json({
    ok: true,
    memos,
    scheduleKeys,
    scheduleWeekdays,
    scheduleTime,
    scheduleNote,
  });
}

const putSchema = z.object({
  dateKey: z.string().min(10).max(10),
  body: z.string().max(BODY_MAX),
});

export async function PUT(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-calendar-memos-put", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success || !parseDateKey(parsed.data.dateKey)) {
    return NextResponse.json({ error: "Invalid dateKey" }, { status: 400 });
  }

  const body = parsed.data.body.trim().slice(0, BODY_MAX);

  if (!body) {
    await db.calendarMemo.deleteMany({
      where: { userId: auth.user.id, dateKey: parsed.data.dateKey },
    });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const row = await db.calendarMemo.upsert({
    where: {
      userId_dateKey: { userId: auth.user.id, dateKey: parsed.data.dateKey },
    },
    create: {
      userId: auth.user.id,
      dateKey: parsed.data.dateKey,
      body,
    },
    update: { body },
    select: { dateKey: true, body: true },
  });

  return NextResponse.json({ ok: true, memo: row });
}
