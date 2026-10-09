import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
});

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-user-block-list", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const rows = await db.userBlock.findMany({
    where: { blockerId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      createdAt: true,
      blocked: { select: userSelect },
    },
  });

  return NextResponse.json({
    users: rows.map((row) => ({
      id: row.blocked.id,
      username: row.blocked.username,
      name: row.blocked.name,
      image: row.blocked.image,
      blockedAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-user-block", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const { userId: targetUserId } = parsed.data;
  if (auth.user.id === targetUserId) {
    return NextResponse.json({ error: "Not found." }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { username: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
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
  revalidatePath("/");
  revalidateTag(FEED_POSTS_CACHE_TAG);
  return NextResponse.json({ ok: true, blocked: true });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-user-unblock", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const { userId: targetUserId } = parsed.data;
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { username: true },
  });

  await db.userBlock.deleteMany({
    where: { blockerId: auth.user.id, blockedId: targetUserId },
  });

  if (target?.username) {
    revalidatePath(`/u/${target.username}`);
  }
  revalidatePath("/");
  revalidateTag(FEED_POSTS_CACHE_TAG);
  return NextResponse.json({ ok: true, blocked: false });
}
