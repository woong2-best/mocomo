import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-events-join", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let entryUrl: string | undefined;
  try {
    const body = (await req.json()) as { entryUrl?: string };
    entryUrl = body.entryUrl?.trim() || undefined;
  } catch {
    entryUrl = undefined;
  }

  try {
    const event = await db.event.findFirst({
      where: {
        id,
        endsAt: { gte: new Date() },
        OR: [
          { createdById: null },
          { registrationFeePaid: true, status: "PUBLISHED" },
        ],
      },
      select: { id: true },
    });
    if (!event) {
      return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
    }

    const participant = await db.eventParticipant.upsert({
      where: { eventId_userId: { eventId: event.id, userId: auth.user.id } },
      create: { eventId: event.id, userId: auth.user.id, entryUrl },
      update: { entryUrl },
      select: { id: true, eventId: true, userId: true },
    });

    return NextResponse.json({ success: true, participant });
  } catch (e) {
    return NextResponse.json({ error: prismaErrorMessage(e) }, { status: 500 });
  }
}
