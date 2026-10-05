import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess, countActiveLiveViewers } from "@/lib/live-room-access";
import { filterLiveChatContent, looksLikeSpamDuplicate } from "@/lib/live-chat-filter";
import { moderateLiveChatFast } from "@/lib/ai-moderation";
import { relayLiveChatToSocket } from "@/lib/live-chat-socket-relay";
import { ensureStringArray } from "@/lib/ensure-array";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { mapLiveChatMessagesWithRoles, mapSingleLiveChatMessage } from "@/lib/live-broadcast/map-chat";
import { assertCanSendLiveChat } from "@/lib/live-broadcast/chat-access";
import { hasBroadcastPermission } from "@/lib/live-broadcast/permissions";
import { listLiveChatDeletedIds } from "@/lib/live-chat-deletion";

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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const initial = req.nextUrl.searchParams.get("initial") === "1";
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  }

  await ensureLiveMember(channelId, authResult.user.id, access.isHost);

  const sinceDate = since ? new Date(since) : null;
  const [messages, deletedIds] = await Promise.all([
    initial
      ? db.liveChatMessage
          .findMany({
            where: { channelId },
            orderBy: { createdAt: "desc" },
            take: 80,
            include: { user: { select: userPublicSelectMinimal } },
          })
          .then((rows) => rows.reverse())
      : db.liveChatMessage.findMany({
          where: {
            channelId,
            createdAt: { gt: sinceDate ?? new Date(0) },
          },
          orderBy: { createdAt: "asc" },
          take: 50,
          include: { user: { select: userPublicSelectMinimal } },
        }),
    initial ? Promise.resolve([] as string[]) : listLiveChatDeletedIds(channelId, sinceDate),
  ]);

  const viewerCount = await countActiveLiveViewers(channelId);

  return NextResponse.json({
    ok: true,
    viewerCount,
    messages: await mapLiveChatMessagesWithRoles(channelId, messages),
    deletedIds,
  });
}

/** POST — send live chat (Bearer) — keep this path fast; mobile clients time out at ~15s. */
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let content = "";
  try {
    const body = await req.json();
    content = typeof body.content === "string" ? body.content.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!content || content.length > 200) {
    return NextResponse.json({ error: "Messages must be 1–200 characters." }, { status: 400 });
  }

  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "Join the stream before chatting." }, { status: 403 });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      slowModeSeconds: true,
      chatBannedWords: true,
    },
  });
  if (!channel) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }

  const filtered = filterLiveChatContent(content, ensureStringArray(channel.chatBannedWords));
  if (!filtered.ok) {
    return NextResponse.json({ error: errorText(filtered.error) }, { status: 400 });
  }

  const [chatAccess, mod] = await Promise.all([
    assertCanSendLiveChat({
      channelId,
      userId: authResult.user.id,
      hostUserId: channel.createdBy,
    }),
    moderateLiveChatFast(filtered.text),
    ensureLiveMember(channelId, authResult.user.id, access.isHost),
  ]);
  if (!chatAccess.ok) {
    return NextResponse.json({ error: errorText(chatAccess.error) }, { status: 403 });
  }
  if (!mod.ok) {
    return NextResponse.json({ error: errorText(mod.error) }, { status: 400 });
  }

  const modExempt = hasBroadcastPermission(chatAccess.role, "chat.delete");

  if (!modExempt) {
    const recentBurst = await db.liveChatMessage.findMany({
      where: { channelId, userId: authResult.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { createdAt: true, content: true },
    });

    if (recentBurst[0] && looksLikeSpamDuplicate(recentBurst[0].content, filtered.text)) {
      return NextResponse.json({ error: "Not found." }, { status: 429 });
    }

    if (channel.slowModeSeconds > 0 && recentBurst[0]) {
      const elapsed = (Date.now() - recentBurst[0].createdAt.getTime()) / 1000;
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
    const mapped = await mapSingleLiveChatMessage(channelId, msg);
    void relayLiveChatToSocket(channelId, mapped);
    return NextResponse.json({ ok: true, message: mapped });
  } catch (e) {
    console.error("[api/mobile/live/chat] create", e);
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
