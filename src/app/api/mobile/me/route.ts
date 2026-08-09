import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import {
  getMobileUserId,
  requireMobileApiUser,
} from "@/lib/api-mobile-auth";
import {
  ACCOUNT_SUSPENDED_WRITE_MESSAGE,
  assertAccountCanWrite,
  isServiceBanned,
} from "@/lib/account-status";
import { isLocale, normalizeLocale } from "@/lib/i18n/config";
import { normalizeTimeZone } from "@/lib/i18n/timezone";

const meSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  locale: true,
  countryCode: true,
  timeZone: true,
  createdAt: true,
  isBanned: true,
  accountStatus: true,
  deletedAt: true,
  premiumTier: true,
  profile: { select: { bio: true, bannerUrl: true } },
  _count: { select: { posts: true, followers: true, following: true } },
} as const;

/** Single DB round-trip for /me (no requireMobileApiUser + second findUnique). */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-me", 120);
  if (limited) return limited;

  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: meSelect,
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  if (isServiceBanned(user)) {
    return NextResponse.json({ error: "이용이 제한된 계정입니다." }, { status: 403 });
  }
  if (user.deletedAt) {
    return NextResponse.json({ error: "탈퇴한 계정입니다." }, { status: 403 });
  }
  try {
    assertAccountCanWrite(user, "default");
  } catch {
    return NextResponse.json(
      { error: ACCOUNT_SUSPENDED_WRITE_MESSAGE, code: "ACCOUNT_SUSPENDED" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      locale: user.locale,
      countryCode: user.countryCode,
      timeZone: user.timeZone,
      bio: user.profile?.bio ?? null,
      bannerUrl: user.profile?.bannerUrl ?? null,
      createdAt: user.createdAt.toISOString(),
      counts: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
      },
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(1000).optional(),
  image: z.string().url().max(2000).optional().nullable(),
  locale: z.string().optional(),
  countryCode: z.string().min(2).max(8).optional(),
  timeZone: z.string().min(1).max(64).optional(),
});

export async function PATCH(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-me-patch", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const data = parsed.data;
  if (data.locale && !isLocale(data.locale)) {
    return NextResponse.json({ error: "지원하지 않는 언어입니다." }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: auth.user.id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.image !== undefined ? { image: data.image } : {}),
        ...(data.locale ? { locale: normalizeLocale(data.locale) } : {}),
        ...(data.countryCode
          ? { countryCode: data.countryCode.trim().toUpperCase() }
          : {}),
        ...(data.timeZone ? { timeZone: normalizeTimeZone(data.timeZone) } : {}),
      },
    });
    if (data.bio !== undefined) {
      await tx.profile.upsert({
        where: { userId: auth.user.id },
        create: { userId: auth.user.id, bio: data.bio },
        update: { bio: data.bio },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
