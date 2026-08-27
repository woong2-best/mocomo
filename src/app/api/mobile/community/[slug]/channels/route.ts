import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { normalizeCommunitySlugParam } from "@/lib/community-slug";
import { ensureCommunityServerProvisioned } from "@/lib/community-server/provision";
import { db } from "@/lib/db";

const TEXT_TYPES = new Set(["TEXT", "ANNOUNCEMENT", "QA"]);
const VOICE_TYPES = new Set(["VOICE", "VIDEO"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-community-channels", 60);
  if (limited) return limited;

  const { slug: raw } = await params;
  const slug = normalizeCommunitySlugParam(raw);
  if (!slug || slug.length > 80) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const community = await db.community.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, isPublic: true },
  });
  if (!community) {
    return NextResponse.json({ error: "커뮤니티를 찾을 수 없습니다." }, { status: 404 });
  }

  await ensureCommunityServerProvisioned(community.id).catch(() => undefined);

  const [textChannels, voiceChannels] = await Promise.all([
    db.communityChannel.findMany({
      where: {
        communityId: community.id,
        type: { in: ["TEXT", "ANNOUNCEMENT", "QA"] },
      },
      orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        position: true,
        chatRoomId: true,
        category: { select: { id: true, name: true } },
      },
    }),
    db.communityChannel.findMany({
      where: {
        communityId: community.id,
        type: { in: ["VOICE", "VIDEO"] },
        voiceChannelId: { not: null },
      },
      orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        position: true,
        voiceChannelId: true,
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    community: { id: community.id, slug: community.slug, name: community.name },
    items: textChannels
      .filter((c) => TEXT_TYPES.has(c.type) && c.chatRoomId)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        type: c.type,
        position: c.position,
        chatRoomId: c.chatRoomId,
        categoryName: c.category?.name ?? null,
      })),
    voiceItems: voiceChannels
      .filter((c) => VOICE_TYPES.has(c.type) && c.voiceChannelId)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        type: c.type,
        position: c.position,
        voiceChannelId: c.voiceChannelId!,
        categoryName: c.category?.name ?? null,
      })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Open channel: body { channelSlug }
  const limited = await rateLimitPublicApi(req, "mobile-community-channel-open", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const { slug: raw } = await params;
  const slug = normalizeCommunitySlugParam(raw);
  if (!slug || slug.length > 80) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let channelSlug = "";
  try {
    const body = (await req.json()) as { channelSlug?: string };
    channelSlug = body.channelSlug?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "channelSlug가 필요합니다." }, { status: 400 });
  }
  if (!channelSlug || channelSlug.length > 80) {
    return NextResponse.json({ error: "channelSlug가 필요합니다." }, { status: 400 });
  }

  const community = await db.community.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  if (!community) {
    return NextResponse.json({ error: "커뮤니티를 찾을 수 없습니다." }, { status: 404 });
  }

  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId: community.id, userId: auth.user.id } },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: "커뮤니티 가입 후 이용할 수 있습니다." }, { status: 403 });
  }

  const channel = await db.communityChannel.findFirst({
    where: { communityId: community.id, slug: channelSlug },
    select: { id: true, slug: true, name: true, type: true, chatRoomId: true },
  });
  if (!channel?.chatRoomId || !TEXT_TYPES.has(channel.type)) {
    return NextResponse.json({ error: "채널을 찾을 수 없습니다." }, { status: 404 });
  }

  await db.chatMember.upsert({
    where: { roomId_userId: { roomId: channel.chatRoomId, userId: auth.user.id } },
    create: { roomId: channel.chatRoomId, userId: auth.user.id, role: "member" },
    update: {},
  });

  return NextResponse.json({
    roomId: channel.chatRoomId,
    channel: {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      type: channel.type,
    },
  });
}
