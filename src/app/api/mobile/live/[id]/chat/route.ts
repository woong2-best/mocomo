import { NextRequest, NextResponse } from "next/server";
import type { SupportTierLevel } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess, countActiveLiveViewers } from "@/lib/live-room-access";
import { filterLiveChatContent, looksLikeSpamDuplicate } from "@/lib/live-chat-filter";
import { moderateLiveChatFast } from "@/lib/ai-moderation";
import { relayLiveChatToSocket } from "@/lib/live-chat-socket-relay";
import { ensureStringArray } from "@/lib/ensure-array";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

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

/** GET — live chat poll (Bearer) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-chat-get", 120);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const initial = req.nextUrl.searchParams.get("initial") === "1";
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  }

  await ensureLiveMember(channelId, authResult.user.id, access.isHost);

  const messages = initial
    ? (
        await db.liveChatMessage.findMany({
          where: { channelId },
          orderBy: { createdAt: "desc" },
          take: 80,
          include: { user: { select: userPublicSelectMinimal } },
        })
      ).reverse()
    : await db.liveChatMessage.findMany({
        where: {
          channelId,
          createdAt: { gt: since ? new Date(since) : new Date(0) },
        },
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

/** POST — send live chat (Bearer) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-chat-post", 40);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

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

  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "방송에 참여한 뒤 채팅할 수 있습니다." }, { status: 403 });
  }

  await ensureLiveMember(channelId, authResult.user.id, access.isHost);

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

  if (!access.isHost) {
    const recentBurst = await db.liveChatMessage.findMany({
      where: { channelId, userId: authResult.user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { createdAt: true, content: true },
    });

    if (recentBurst[0] && looksLikeSpamDuplicate(recentBurst[0].content, filtered.text)) {
      return NextResponse.json({ error: "같은 메시지를 연속으로 보낼 수 없습니다." }, { status: 429 });
    }
  }

  if (channel.slowModeSeconds > 0 && !access.isHost) {
    const last = await db.liveChatMessage.findFirst({
      where: { channelId, userId: authResult.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
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
    }
  }

  try {
    const msg = await db.liveChatMessage.create({
      data: { channelId, userId: authResult.user.id, content: filtered.text },
      include: { user: { select: userPublicSelectMinimal } },
    });
    const mapped = mapMsg(msg);
    void relayLiveChatToSocket(channelId, mapped);
    return NextResponse.json({ ok: true, message: mapped });
  } catch (e) {
    console.error("[api/mobile/live/chat] create", e);
    return NextResponse.json({ error: "채팅 저장에 실패했습니다." }, { status: 500 });
  }
}
