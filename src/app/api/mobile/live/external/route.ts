import { NextRequest, NextResponse } from "next/server";
import type { LiveStreamCategory } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { assertLiveHostEligible } from "@/lib/live-host-eligibility";
import { formatLiveCreateError } from "@/lib/live-create-errors";
import { prepareHostForNewBroadcast } from "@/lib/live-broadcast/session-manager";
import { notifyFollowersOnLive } from "@/lib/live-notify";
import { revalidateLiveHubCache } from "@/lib/live-hub-data";
import { isExternalLiveEnabled } from "@/lib/live-feature";
import { checkYoutubeMadeForKids } from "@/lib/live-external/youtube-kids";
import { probeChzzkEmbed } from "@/lib/live-external/chzzk-probe";
import { mintOverlayToken } from "@/lib/live-external/overlay-token";
import { platformToLiveExternal } from "@/lib/streaming-accounts/types";
import { resolveVerifiedLiveSource } from "@/lib/streaming-accounts/service";
import { parseLiveCategoryParam } from "@/lib/live-categories";

const ALLOWED_CATS = new Set([
  "LIVE",
  "JUST_CHATTING",
  "GAME",
  "MUSIC",
  "IRL",
]);

/**
 * Create EXTERNAL live room from verified streaming account (Bearer).
 * Same product path as web createExternalLiveStream.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-external-create", 10);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  if (!isExternalLiveEnabled()) {
    return NextResponse.json(
      { error: "외부 방송 연동이 비활성화되어 있습니다." },
      { status: 503 }
    );
  }

  let body: {
    name?: string;
    connectedAccountId?: string;
    category?: string;
    goLive?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const accountId = body.connectedAccountId?.trim();
  if (!accountId) {
    return NextResponse.json(
      { error: "인증된 스트리밍 계정을 선택해 주세요." },
      { status: 400 }
    );
  }

  try {
    const user = authResult.user;
    const hostCheck = await assertLiveHostEligible(user.id);
    if (!hostCheck.ok) {
      return NextResponse.json({ error: hostCheck.error }, { status: 403 });
    }

    const account = await db.connectedStreamingAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        userId: true,
        platform: true,
        channelId: true,
        channelName: true,
        verified: true,
        revokedAt: true,
      },
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: "스트리밍 계정을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!account.verified || account.revokedAt) {
      return NextResponse.json(
        {
          error:
            "인증되지 않았거나 해제된 스트리밍 계정입니다. 웹 설정에서 계정을 다시 연결해 주세요.",
        },
        { status: 403 }
      );
    }

    const liveProvider = platformToLiveExternal(account.platform);
    if (!liveProvider) {
      return NextResponse.json(
        { error: "이 플랫폼은 외부 라이브 임베드를 아직 지원하지 않습니다." },
        { status: 400 }
      );
    }

    const resolved = await resolveVerifiedLiveSource(accountId, user.id);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const parsed = resolved;

    if (parsed.provider === "YOUTUBE") {
      const kids = await checkYoutubeMadeForKids(parsed.externalId);
      if (!kids.ok) {
        return NextResponse.json({ error: kids.error }, { status: 400 });
      }
      if (kids.madeForKids) {
        return NextResponse.json(
          {
            error:
              "Made for Kids로 표시된 YouTube 영상은 정책상 임베드할 수 없습니다. 다른 라이브를 연결해 주세요.",
          },
          { status: 400 }
        );
      }
    }

    let chzzkEmbedOk = parsed.embedSupported;
    if (parsed.provider === "CHZZK") {
      const probe = await probeChzzkEmbed(parsed.externalId);
      chzzkEmbedOk = probe.recommendEmbed;
    }

    const prep = await prepareHostForNewBroadcast(user.id);
    if (!prep.ok) {
      return NextResponse.json(
        { error: prep.error, existingChannelId: prep.blockingChannelId },
        { status: 409 }
      );
    }

    await db.voiceChannel.updateMany({
      where: {
        createdBy: user.id,
        isLive: false,
        liveStatus: { in: ["SCHEDULED", "LIVE"] },
      },
      data: { isLive: false, liveStatus: "ENDED", endedAt: new Date() },
    });

    const goLive = body.goLive !== false;
    const catRaw = body.category?.trim();
    const category = (
      catRaw && ALLOWED_CATS.has(catRaw)
        ? catRaw
        : parseLiveCategoryParam(catRaw) ?? "JUST_CHATTING"
    ) as LiveStreamCategory;

    const title = body.name?.trim() || `${account.channelName} 라이브`;

    const channel = await db.voiceChannel.create({
      data: {
        name: title.slice(0, 120),
        createdBy: user.id,
        maxUsers: 500,
        allowScreen: false,
        allowCamera: false,
        isLive: goLive,
        liveStatus: goLive ? "LIVE" : "SCHEDULED",
        category,
        broadcastMode: "EXTERNAL",
        mediaSourceType: "EXTERNAL",
        externalProvider: parsed.provider,
        externalId: parsed.externalId,
        externalChannelId: account.channelId,
        externalWatchUrl: parsed.watchUrl,
        connectedStreamingAccountId: account.id,
        liveVisibility: "PUBLIC",
        members: {
          create: {
            userId: user.id,
            role: "HOST",
            lastSeenAt: new Date(),
          },
        },
      },
    });

    try {
      await db.streamerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    } catch {
      /* optional */
    }

    if (goLive) {
      void notifyFollowersOnLive(user.id, channel.id, channel.name).catch(() => {});
    }

    revalidateLiveHubCache();

    const chatToken = mintOverlayToken(channel.id, "chat");

    return NextResponse.json({
      channel: { id: channel.id, name: channel.name },
      provider: parsed.provider,
      watchUrl: parsed.watchUrl,
      embedSupported: parsed.provider === "CHZZK" ? chzzkEmbedOk : parsed.embedSupported,
      overlay: {
        chatUrl: chatToken
          ? `/overlay/chat/${channel.id}?token=${encodeURIComponent(chatToken)}`
          : null,
      },
    });
  } catch (e) {
    console.error("[api/mobile/live/external]", e);
    return NextResponse.json({ error: formatLiveCreateError(e) }, { status: 500 });
  }
}
