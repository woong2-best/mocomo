import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { parseDateKey } from "@/lib/calendar/kr-calendar";

const BODY_MAX = 2000;

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

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

  const { from, to } = monthRange(year, month);
  const rows = await db.calendarMemo.findMany({
    where: {
      userId: auth.user.id,
      dateKey: { gte: from, lte: to },
    },
    select: { dateKey: true, body: true },
    orderBy: { dateKey: "asc" },
  });

  const memos: Record<string, string> = {};
  for (const row of rows) memos[row.dateKey] = row.body;

  return NextResponse.json({ ok: true, memos });
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
