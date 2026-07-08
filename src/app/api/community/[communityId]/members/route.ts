import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * 가벼운 멤버 목록 — 역할 조인 없이 빠르게, 실패 시 빈 배열.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ members: [] });
    }

    const rows = await db.communityMember.findMany({
      where: { communityId },
      orderBy: [{ joinedAt: "asc" }],
      take: 40,
      select: {
        id: true,
        userId: true,
        role: true,
        nickname: true,
        presence: true,
        joinedAt: true,
      },
    });

    const users = await db.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, username: true, name: true, image: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const members = rows.map((r) => {
      const u = byId.get(r.userId);
      return {
        id: r.id,
        userId: r.userId,
        username: u?.username ?? "unknown",
        name: u?.name ?? null,
        image: u?.image ?? null,
        nickname: r.nickname,
        presence: r.presence ?? "OFFLINE",
        roles: [],
        isOwner: r.role === "owner",
        joinedAt: r.joinedAt.toISOString(),
      };
    });

    return NextResponse.json({ members });
  } catch (e) {
    console.error("[api/community/members]", e);
    return NextResponse.json({ members: [] });
  }
}
