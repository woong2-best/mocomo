import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { parseDateKey } from "@/lib/calendar/kr-calendar";

const BODY_MAX = 2000;

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

/** GET ?year=2026&month=10 — memos for that month */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimitPublicApi(req, "calendar-memos-get", 60);
  if (limited) return limited;

  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  if (!Number.isInteger(year) || year < 1970 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }

  const { from, to } = monthRange(year, month);
  const rows = await db.calendarMemo.findMany({
    where: {
      userId: session.user.id,
      dateKey: { gte: from, lte: to },
    },
    select: { dateKey: true, body: true, updatedAt: true },
    orderBy: { dateKey: "asc" },
  });

  const memos: Record<string, string> = {};
  for (const row of rows) memos[row.dateKey] = row.body;

  return NextResponse.json(
    { ok: true, memos },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

/** PUT { dateKey, body } — upsert; empty body deletes */
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

  const body = bodyRaw.trim().slice(0, BODY_MAX);

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
