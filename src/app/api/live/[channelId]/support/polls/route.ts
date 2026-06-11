import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { db } from "@/lib/db";
import type { LiveSupportPollPayload, PollOption } from "@/lib/live-support/types";

function parsePollOptions(raw: unknown): PollOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o, i) => {
      if (!o || typeof o !== "object") return null;
      const row = o as { id?: string; label?: string; votes?: number };
      const label = String(row.label ?? "").trim();
      if (!label) return null;
      return {
        id: String(row.id ?? `opt-${i}`),
        label,
        votes: typeof row.votes === "number" ? row.votes : 0,
      };
    })
    .filter(Boolean) as PollOption[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  }

  const row = await db.liveSupportPoll
    .findFirst({
      where: { channelId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  if (!row) {
    return NextResponse.json({ ok: true, poll: null });
  }

  const poll: LiveSupportPollPayload = {
    id: row.id,
    channelId: row.channelId,
    question: row.question,
    options: parsePollOptions(row.options),
    voteCost: row.voteCost,
    status: row.status,
    endsAt: row.endsAt?.getTime() ?? null,
  };

  return NextResponse.json({ ok: true, poll });
}
