import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-user-block", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
  }

  const { userId: targetUserId } = parsed.data;
  if (auth.user.id === targetUserId) {
    return NextResponse.json({ error: "자기 자신은 차단할 수 없습니다." }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { username: true },
  });
  if (!target) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  await db.$transaction([
    db.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId: auth.user.id, blockedId: targetUserId },
      },
      create: { blockerId: auth.user.id, blockedId: targetUserId },
      update: {},
    }),
    db.follow.deleteMany({
      where: {
        OR: [
          { followerId: auth.user.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: auth.user.id },
        ],
      },
    }),
  ]);

  revalidatePath(`/u/${target.username}`);
  return NextResponse.json({ ok: true, blocked: true });
}
