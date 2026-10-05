import { errorText } from "@/lib/i18n/error-text";
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
import { mintStudioObsChatForUser } from "@/lib/live-external/studio-obs-url";
import { platformToLiveExternal } from "@/lib/streaming-accounts/types";
import {
  getAccountTokens,
  resolveVerifiedLiveSource,
} from "@/lib/streaming-accounts/service";
import { parseLiveCategoryParam } from "@/lib/live-categories";

const ALLOWED_CATS = new Set([
  "LIVE",
  "JUST_CHATTING",
  "GAME",
  "MUSIC",
  "IRL",
  "VIRTUAL",
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
      { error: "External stream linking is disabled." },
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const accountId = body.connectedAccountId?.trim();
  if (!accountId) {
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 400 }
    );
  }

  try {
    const user = authResult.user;
    const hostCheck = await assertLiveHostEligible(user.id);
    if (!hostCheck.ok) {
      return NextResponse.json({ error: errorText(hostCheck.error) }, { status: 403 });
    }

    const account = await db.connectedStreamingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: "Streaming account not found." }, { status: 404 });
    }
    if (!account.verified || account.revokedAt) {
      return NextResponse.json(
        {
          error:
            "Please sign in to continue.",
        },
        { status: 403 }
      );
    }

    const liveProvider = platformToLiveExternal(account.platform);
    if (!liveProvider) {
      return NextResponse.json(
        { error: "External live embed is not supported for this platform yet." },
        { status: 400 }
      );
    }

    const resolved = await resolveVerifiedLiveSource(accountId, user.id);
    if ("errorKey" in resolved && resolved.errorKey) {
      return NextResponse.json({ error: String(resolved.errorKey) }, { status: 400 });
    }
    if ("error" in resolved && resolved.error) {
      return NextResponse.json({ error: errorText(resolved.error) }, { status: 400 });
    }
    if (!("provider" in resolved)) {
      return NextResponse.json({ error: "live.external.resolveFailed" }, { status: 400 });
    }
    const parsed = resolved;

    if (parsed.provider === "YOUTUBE") {
      const tokens = await getAccountTokens(account);
      const kids = await checkYoutubeMadeForKids(parsed.externalId, {
        accessToken: tokens?.accessToken,
      });
      if (!kids.ok) {
        return NextResponse.json({ error: errorText(kids.error) }, { status: 400 });
      }
      if (kids.madeForKids) {
        return NextResponse.json(
          {
            error:
              "Not found.",
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
        { error: errorText(prep.error), existingChannelId: prep.blockingChannelId },
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

    const { fetchExternalPlatformMetadata } = await import(
      "@/lib/live-external/platform-metadata"
    );
    const platformMeta = await fetchExternalPlatformMetadata(
      parsed.provider,
      parsed.externalId
    );
    const title =
      platformMeta.title?.trim() ||
      body.name?.trim() ||
      `${account.channelName} 라이브`;
    const description = platformMeta.description?.trim().slice(0, 500) || null;

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
        description,
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

    const overlayUrls = await mintStudioObsChatForUser(user.id);

    return NextResponse.json({
      channel: { id: channel.id, name: channel.name },
      provider: parsed.provider,
      watchUrl: parsed.watchUrl,
      embedSupported: parsed.provider === "CHZZK" ? chzzkEmbedOk : parsed.embedSupported,
      overlay: {
        chatUrl: "chatUrl" in overlayUrls ? overlayUrls.chatUrl : null,
        donationUrl: "donationUrl" in overlayUrls ? overlayUrls.donationUrl : null,
        mocoWidgetUrl: "mocoWidgetUrl" in overlayUrls ? overlayUrls.mocoWidgetUrl : null,
      },
    });
  } catch (e) {
    console.error("[api/mobile/live/external]", e);
    return NextResponse.json({ error: formatLiveCreateError(e) }, { status: 500 });
  }
}
