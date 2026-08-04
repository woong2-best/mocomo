/** Phase 0 — 자체 송출 이용 규모 (읽기 전용) */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const live_now = await db.voiceChannel.count({
    where: { isLive: true, liveStatus: "LIVE" },
  });

  const since30 = new Date(Date.now() - 30 * 864e5);
  const channels = await db.voiceChannel.findMany({
    where: {
      OR: [
        { isLive: true },
        { AND: [{ createdAt: { gt: since30 } }, { rtmpIngressId: { not: null } }] },
        { AND: [{ endedAt: { gt: since30 } }] },
      ],
    },
    select: { createdBy: true, isLive: true, rtmpIngressId: true },
  });
  const hosts = new Set(channels.map((c) => c.createdBy));

  const since7 = new Date(Date.now() - 7 * 864e5);
  const chatMsgs = await db.liveChatMessage.count({
    where: { createdAt: { gt: since7 } },
  });
  const chatRows = await db.liveChatMessage.findMany({
    where: { createdAt: { gt: since7 } },
    select: { channelId: true, userId: true },
    take: 50_000,
  });

  const tipAgg = await db.tip.aggregate({
    where: { channelId: { not: null }, createdAt: { gt: since30 } },
    _count: true,
    _sum: { amount: true },
  });

  const vodWithHls = await db.postMedia.count({
    where: { OR: [{ hlsUrl: { not: null } }, { streamUid: { not: null } }] },
  });

  const cfLiveInputs = await db.voiceChannel.count({
    where: { rtmpIngressId: { startsWith: "cf:" } },
  });
  const srsChannels = await db.voiceChannel.count({
    where: { rtmpIngressId: { startsWith: "srs:" } },
  });

  console.log(
    JSON.stringify(
      {
        live_now,
        channels_touched_30d: channels.length,
        distinct_hosts_30d: hosts.size,
        chat_msgs_7d: chatMsgs,
        channels_with_chat_7d: new Set(chatRows.map((x) => x.channelId)).size,
        chatters_7d: new Set(chatRows.map((x) => x.userId)).size,
        tips_with_channel_30d: tipAgg._count,
        tip_sum_30d: tipAgg._sum.amount || 0,
        post_media_with_stream_or_hls: vodWithHls,
        cfLiveInputs,
        srsChannels,
        notice:
          live_now === 0 && hosts.size === 0 && chatMsgs === 0
            ? "공지 최소 — 바로 숨김 가능"
            : "활성 이용 흔적 있음 — 공지 권장",
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
