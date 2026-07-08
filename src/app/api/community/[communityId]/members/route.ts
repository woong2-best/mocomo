import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPrimaryRoleType } from "@/lib/community-server/member-role-utils";

export const runtime = "nodejs";
export const maxDuration = 12;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params;
    if (!communityId) return NextResponse.json({ members: [] });

    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true },
    });
    if (!community) return NextResponse.json({ members: [] });

    const rows = await db.communityMember.findMany({
      where: { communityId },
      orderBy: [{ joinedAt: "asc" }],
      take: 80,
      select: {
        id: true,
        userId: true,
        role: true,
        nickname: true,
        presence: true,
        voiceActivity: true,
        joinedAt: true,
        memberRoles: {
          select: {
            role: {
              select: { id: true, name: true, type: true, color: true, position: true },
            },
          },
        },
      },
    });

    const users = await db.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, username: true, name: true, image: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const members = rows.map((r) => {
      const u = byId.get(r.userId);
      const roles = r.memberRoles
        .map((mr) => mr.role)
        .sort((a, b) => a.position - b.position);
      const isOwner = r.role === "owner" || community.creatorId === r.userId;
      return {
        id: r.id,
        userId: r.userId,
        username: u?.username ?? "unknown",
        name: u?.name ?? null,
        image: u?.image ?? null,
        nickname: r.nickname,
        presence: r.presence ?? "OFFLINE",
        voiceActivity: r.voiceActivity,
        roles,
        primaryRoleType: getPrimaryRoleType(roles, isOwner),
        isOwner,
        joinedAt: r.joinedAt.toISOString(),
      };
    });

    return NextResponse.json({ members });
  } catch (e) {
    console.error("[api/community/members]", e);
    return NextResponse.json({ members: [] });
  }
}
