import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { normalizeCommunitySlugParam } from "@/lib/community-slug";
import { db } from "@/lib/db";
import { notifyCommunityJoin, notifyJoinRequestPending } from "@/lib/notifications";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

async function addMember(communityId: string, userId: string) {
  await db.$transaction(async (tx) => {
    const member = await tx.communityMember.create({
      data: { communityId, userId, role: "member", presence: "ONLINE" },
    });
    await tx.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: 1 } },
    });
    const defaultRole = await tx.communityRole.findFirst({
      where: { communityId, isDefault: true },
      select: { id: true },
    });
    if (defaultRole) {
      await tx.communityMemberRole.create({
        data: { memberId: member.id, roleId: defaultRole.id },
      });
    }
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-community-join", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { slug: raw } = await params;
  const slug = normalizeCommunitySlugParam(raw);
  if (!slug || slug.length > 80) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let inviteCode: string | undefined;
  try {
    const body = (await req.json()) as { inviteCode?: string };
    inviteCode = body.inviteCode?.trim() || undefined;
  } catch {
    inviteCode = undefined;
  }

  try {
    const community = await db.community.findUnique({
      where: { slug },
      select: { id: true, slug: true, creatorId: true, joinMode: true, memberCount: true },
    });
    if (!community) {
      return NextResponse.json({ error: "커뮤니티를 찾을 수 없습니다." }, { status: 404 });
    }

    const banned = await db.communityBan.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: auth.user.id } },
    });
    if (banned && (!banned.expiresAt || banned.expiresAt > new Date())) {
      return NextResponse.json({ error: "이 커뮤니티에 참여할 수 없습니다." }, { status: 403 });
    }

    const existing = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: auth.user.id } },
      select: { id: true },
    });
    if (existing) {
      const permissions = await loadMemberPermissions(
        community.id,
        auth.user.id,
        community.creatorId === auth.user.id
      );
      return NextResponse.json({
        success: true,
        isMember: true,
        memberCount: community.memberCount,
        permissions,
      });
    }

    if (community.joinMode === "INVITE_ONLY") {
      if (!inviteCode) {
        return NextResponse.json({ error: "초대 링크가 필요한 커뮤니티입니다." }, { status: 400 });
      }
      const invite = await db.communityInvite.findFirst({
        where: { communityId: community.id, code: inviteCode },
      });
      if (!invite) {
        return NextResponse.json({ error: "유효하지 않은 초대 링크입니다." }, { status: 400 });
      }
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return NextResponse.json({ error: "만료된 초대 링크입니다." }, { status: 400 });
      }
      if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
        return NextResponse.json({ error: "초대 링크 사용 횟수가 초과되었습니다." }, { status: 400 });
      }
      await db.communityInvite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      });
    } else if (community.joinMode === "APPROVE") {
      await db.communityJoinRequest.upsert({
        where: { communityId_userId: { communityId: community.id, userId: auth.user.id } },
        create: { communityId: community.id, userId: auth.user.id, status: "PENDING" },
        update: { status: "PENDING", reviewedAt: null },
      });
      const mods = await db.communityMember.findMany({
        where: { communityId: community.id },
        select: { userId: true },
        take: 40,
      });
      void notifyJoinRequestPending(
        community.id,
        community.slug,
        auth.user.id,
        [community.creatorId, ...mods.map((m) => m.userId)]
      );
      return NextResponse.json({
        success: true,
        pending: true,
        message: "가입 요청이 접수되었습니다. 승인 후 알림을 받게 됩니다.",
      });
    }

    await addMember(community.id, auth.user.id);
    void notifyCommunityJoin(community.id, community.slug, community.creatorId, auth.user.id);

    const permissions = await loadMemberPermissions(
      community.id,
      auth.user.id,
      community.creatorId === auth.user.id
    );

    return NextResponse.json({
      success: true,
      isMember: true,
      memberCount: community.memberCount + 1,
      permissions,
    });
  } catch (e) {
    return NextResponse.json({ error: prismaErrorMessage(e) }, { status: 500 });
  }
}
