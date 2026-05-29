import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess, countActiveLiveViewers } from "@/lib/live-room-access";
import { filterLiveChatContent, looksLikeSpamDuplicate } from "@/lib/live-chat-filter";
import { moderateLiveChatFast } from "@/lib/ai-moderation";
import { ensureStringArray } from "@/lib/ensure-array";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import type { SupportTierLevel } from "@prisma/client";

function mapMsg(m: {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    image: string | null;
    supportTierSent: SupportTierLevel;
  };
}) {
  return {
    id: m.id,
    userId: m.user.id,
    username: m.user.username,
    content: m.content,
    at: m.createdAt.getTime(),
    image: m.user.image,
    supportTierSent: m.user.supportTierSent,
  };
}

async function ensureLiveMember(channelId: string, userId: string, isHost: boolean) {
  await db.voiceMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: {
      channelId,
      userId,
      role: isHost ? "HOST" : "VIEWER",
      lastSeenAt: new Date(),
    },
    update: { lastSeenAt: new Date() },
  });
}

/** GET — 채팅 동기화 (폴링용, 가벼움) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  }

  const sinceDate = since ? new Date(since) : new Date(0);
  const messages = await db.liveChatMessage.findMany({
    where: { channelId, createdAt: { gt: sinceDate } },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: { select: userPublicSelectMinimal } },
  });

  const viewerCount = await countActiveLiveViewers(channelId);

  return NextResponse.json({
    ok: true,
    viewerCount,
    messages: messages.map(mapMsg),
  });
}

/** POST — 채팅 전송 (서버 액션보다 빠른 JSON API) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  let content = "";
  try {
    const body = await req.json();
    content = typeof body.content === "string" ? body.content.trim() : "";
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!content || content.length > 200) {
    return NextResponse.json({ error: "메시지는 1~200자입니다." }, { status: 400 });
  }

  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "방송에 참여한 뒤 채팅할 수 있습니다." }, { status: 403 });
  }

  await ensureLiveMember(channelId, session.user.id, access.isHost);

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { slowModeSeconds: true, chatBannedWords: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }

  const filtered = filterLiveChatContent(content, ensureStringArray(channel.chatBannedWords));
  if (!filtered.ok) {
    return NextResponse.json({ error: filtered.error }, { status: 400 });
  }

  const mod = await moderateLiveChatFast(filtered.text);
  if (!mod.ok) {
    return NextResponse.json({ error: mod.error }, { status: 400 });
  }

  if (channel.slowModeSeconds > 0 && !access.isHost) {
    const last = await db.liveChatMessage.findFirst({
      where: { channelId, userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, content: true },
    });
    if (last) {
      const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
      if (elapsed < channel.slowModeSeconds) {
        return NextResponse.json(
          {
            error: `슬로우 모드: ${Math.ceil(channel.slowModeSeconds - elapsed)}초 후에 다시 보낼 수 있습니다.`,
          },
          { status: 429 }
        );
      }
      if (looksLikeSpamDuplicate(last.content, filtered.text)) {
        return NextResponse.json({ error: "같은 메시지를 연속으로 보낼 수 없습니다." }, { status: 429 });
      }
    }
  }

  try {
    const msg = await db.liveChatMessage.create({
      data: { channelId, userId: session.user.id, content: filtered.text },
      include: { user: { select: userPublicSelectMinimal } },
    });
    return NextResponse.json({ ok: true, message: mapMsg(msg) });
  } catch (e) {
    console.error("[api/live/chat] create", e);
    const msg = e instanceof Error ? e.message : "";
    if (/LiveChatMessage|does not exist|relation/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "채팅 DB가 준비되지 않았습니다. Supabase에서 supabase-fix-all.sql을 실행해 주세요.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "채팅 저장에 실패했습니다." }, { status: 500 });
  }
}
