import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
  username: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-user-mute", 40);
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
    return NextResponse.json({ error: "자기 자신은 뮤트할 수 없습니다." }, { status: 400 });
  }

  // Resolve the username from the target rather than trusting the body, which
  // would otherwise let a caller invalidate any /u/... path it likes.
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { username: true },
  });

  const existing = await db.userMute.findUnique({
    where: {
      muterId_mutedId: { muterId: auth.user.id, mutedId: targetUserId },
    },
    select: { id: true },
  });

  if (existing) {
    await db.userMute.delete({ where: { id: existing.id } });
    if (target?.username) revalidatePath(`/u/${target.username}`);
    return NextResponse.json({ muted: false });
  }

  await db.userMute.create({
    data: { muterId: auth.user.id, mutedId: targetUserId },
  });
  if (target?.username) revalidatePath(`/u/${target.username}`);
  return NextResponse.json({ muted: true });
}
