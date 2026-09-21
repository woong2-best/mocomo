import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { parseDateKey } from "@/lib/calendar/kr-calendar";
import { getCalendarMemosForMonth } from "@/lib/calendar/memos-with-schedule";

const BODY_MAX = 2000;

/**
 * GET ?year=&month= — own calendar (auth required)
 * GET ?year=&month=&username= — public profile calendar (anyone)
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "calendar-memos-get", 60);
  if (limited) return limited;

  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  if (!Number.isInteger(year) || year < 1970 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }

  const usernameRaw = req.nextUrl.searchParams.get("username")?.trim() ?? "";
  const session = await auth();

  let userId: string | null = null;
  let canEdit = false;

  if (usernameRaw) {
    const profileUser = await db.user.findFirst({
      where: { username: { equals: usernameRaw, mode: "insensitive" } },
      select: { id: true },
    });
    if (!profileUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    userId = profileUser.id;
    canEdit = session?.user?.id === profileUser.id;
  } else {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = session.user.id;
    canEdit = true;
  }

  const { memos, scheduleWeekdays, scheduleTime, scheduleNote } =
    await getCalendarMemosForMonth(userId, year, month);

  return NextResponse.json(
    {
      ok: true,
      memos,
      scheduleWeekdays,
      scheduleTime,
      scheduleNote,
      canEdit,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

/** PUT { dateKey, body } — upsert; empty body deletes (owner only) */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimitPublicApi(req, "calendar-memos-put", 40);
  if (limited) return limited;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dateKeyRaw = typeof (payload as { dateKey?: unknown })?.dateKey === "string"
    ? (payload as { dateKey: string }).dateKey.trim()
    : "";
  const bodyRaw = typeof (payload as { body?: unknown })?.body === "string"
    ? (payload as { body: string }).body
    : "";

  if (!parseDateKey(dateKeyRaw)) {
    return NextResponse.json({ error: "Invalid dateKey" }, { status: 400 });
  }

  // Preserve newlines for sticky memo; trim only outer whitespace
  const body = bodyRaw.replace(/^\s+|\s+$/g, "").slice(0, BODY_MAX);

  if (!body) {
    await db.calendarMemo.deleteMany({
      where: { userId: session.user.id, dateKey: dateKeyRaw },
    });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const row = await db.calendarMemo.upsert({
    where: {
      userId_dateKey: { userId: session.user.id, dateKey: dateKeyRaw },
    },
    create: {
      userId: session.user.id,
      dateKey: dateKeyRaw,
      body,
    },
    update: { body },
    select: { dateKey: true, body: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, memo: row });
}
