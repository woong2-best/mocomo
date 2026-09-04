import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  getMobileUserId,
  requireMobileApiUser,
} from "@/lib/api-mobile-auth";
import {
  ACCOUNT_SUSPENDED_WRITE_MESSAGE,
  assertAccountCanWrite,
  isServiceBanned,
} from "@/lib/account-status";
import { FEED_POSTS_CACHE_TAG, profileUserCacheTag } from "@/lib/cache-tags";
import { isLocale, normalizeLocale } from "@/lib/i18n/config";
import { normalizeTimeZone } from "@/lib/i18n/timezone";
import {
  applyProfileUpdateForUser,
  getProfileSettingsForUser,
} from "@/lib/profile-update-service";
import { isValidUsername, normalizeUsername } from "@/lib/username-policy";
import { assertCountrySelectable } from "@/lib/compliance/ofac-sanctioned-countries";

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
  passwordHash: true,
  profile: { select: { bio: true, bannerUrl: true, bannerVideoUrl: true } },
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

  const settings = await getProfileSettingsForUser(userId);

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
      bannerVideoUrl: user.profile?.bannerVideoUrl ?? null,
      createdAt: user.createdAt.toISOString(),
      counts: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
      },
      hasPassword: Boolean(user.passwordHash),
      settings: settings
        ? {
            mainCharacter: settings.mainCharacter,
            favoriteTags: settings.favoriteTags,
            location: settings.location,
            website: settings.website,
            showNsfw: settings.showNsfw,
            birthYear: settings.birthYear,
            birthMonth: settings.birthMonth,
            birthDay: settings.birthDay,
            showBirthdayOnProfile: settings.showBirthdayOnProfile,
            usernameChangesRemaining: settings.usernameChangesRemaining,
            usernameChangeResetAt: settings.usernameChangeResetAt,
          }
        : null,
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(160).optional(),
  image: z.string().url().max(2000).optional().nullable(),
  bannerUrl: z.string().url().max(2000).optional().nullable(),
  bannerVideoUrl: z.string().url().max(2000).optional().nullable(),
  username: z.string().min(3).max(20).optional(),
  mainCharacter: z.string().max(120).optional(),
  favoriteTags: z.array(z.string().max(80)).max(32).optional(),
  location: z.string().max(120).optional(),
  website: z.string().max(200).optional(),
  showNsfw: z.boolean().optional(),
  showBirthdayOnProfile: z.boolean().optional(),
  birthYear: z.number().int().min(1900).max(2100).optional(),
  birthMonth: z.number().int().min(1).max(12).optional(),
  birthDay: z.number().int().min(1).max(31).optional(),
  clearBirthDate: z.boolean().optional(),
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
  if (data.username !== undefined && !isValidUsername(normalizeUsername(data.username))) {
    return NextResponse.json(
      { error: "아이디는 영문·숫자·_ 3~20자입니다." },
      { status: 400 }
    );
  }

  const currentUsername = auth.user.username;
  const usernameChanged =
    data.username !== undefined &&
    normalizeUsername(data.username) !== normalizeUsername(currentUsername);

  // snsLinks is a whole-column replace downstream, and it also carries keys this
  // endpoint knows nothing about (minigame state, other link fields). Merge into
  // the stored blob instead of rebuilding it from the two fields sent here.
  const touchesSnsLinks = data.location !== undefined || data.website !== undefined;
  let snsLinks: Prisma.InputJsonObject | undefined;
  if (touchesSnsLinks) {
    const current = await db.profile.findUnique({
      where: { userId: auth.user.id },
      select: { snsLinks: true },
    });
    const stored = current?.snsLinks;
    const base: Record<string, Prisma.InputJsonValue> =
      stored && typeof stored === "object" && !Array.isArray(stored)
        ? { ...(stored as Record<string, Prisma.InputJsonValue>) }
        : {};
    for (const key of ["location", "website"] as const) {
      const value = data[key];
      if (value === undefined) continue;
      if (value.trim()) base[key] = value.trim();
      else delete base[key];
    }
    snsLinks = base;
  }

  const result = await applyProfileUpdateForUser(auth.user.id, {
    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    ...(data.bio !== undefined ? { bio: data.bio } : {}),
    ...(data.image !== undefined ? { image: data.image } : {}),
    ...(data.bannerUrl !== undefined ? { bannerUrl: data.bannerUrl } : {}),
    ...(data.bannerVideoUrl !== undefined ? { bannerVideoUrl: data.bannerVideoUrl } : {}),
    ...(usernameChanged ? { username: normalizeUsername(data.username!) } : {}),
    ...(data.mainCharacter !== undefined ? { mainCharacter: data.mainCharacter } : {}),
    ...(data.favoriteTags !== undefined ? { favoriteTags: data.favoriteTags } : {}),
    ...(data.showNsfw !== undefined ? { showNsfw: data.showNsfw } : {}),
    ...(data.showBirthdayOnProfile !== undefined
      ? { showBirthdayOnProfile: data.showBirthdayOnProfile }
      : {}),
    ...(data.clearBirthDate
      ? { clearBirthDate: true }
      : data.birthYear !== undefined &&
          data.birthMonth !== undefined &&
          data.birthDay !== undefined
        ? {
            birthYear: data.birthYear,
            birthMonth: data.birthMonth,
            birthDay: data.birthDay,
          }
        : {}),
    ...(snsLinks ? { snsLinks } : {}),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (data.locale || data.countryCode || data.timeZone) {
    if (data.countryCode) {
      const countryBlock = assertCountrySelectable(data.countryCode);
      if (countryBlock) {
        return NextResponse.json({ error: countryBlock.error }, { status: 403 });
      }
    }
    await db.user.update({
      where: { id: auth.user.id },
      data: {
        ...(data.locale ? { locale: normalizeLocale(data.locale) } : {}),
        ...(data.countryCode
          ? { countryCode: data.countryCode.trim().toUpperCase() }
          : {}),
        ...(data.timeZone ? { timeZone: normalizeTimeZone(data.timeZone) } : {}),
      },
    });
  }

  if (
    data.name !== undefined ||
    data.image !== undefined ||
    usernameChanged
  ) {
    revalidateTag(FEED_POSTS_CACHE_TAG);
    revalidatePath(`/cosplay/${currentUsername}`);
    if (usernameChanged && data.username) {
      revalidatePath(`/cosplay/${normalizeUsername(data.username)}`);
    }
  }

  revalidatePath(`/u/${currentUsername}`);
  revalidateTag(profileUserCacheTag(currentUsername));
  if (usernameChanged && data.username) {
    const next = normalizeUsername(data.username);
    revalidatePath(`/u/${next}`);
    revalidateTag(profileUserCacheTag(next));
  }
  revalidatePath("/settings/profile");

  return NextResponse.json({ ok: true });
}
