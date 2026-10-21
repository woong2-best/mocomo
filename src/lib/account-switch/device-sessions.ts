import { randomBytes } from "crypto";
import type { AccountStatus } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isOperatorIdentity, isStaffIdentity, effectiveRole } from "@/lib/operator-config";
import { isServiceBanned, isSuspendedReadOnly } from "@/lib/account-status";
import { displayableImageUrl } from "@/lib/displayable-image-url";
import {
  DEVICE_ACCOUNT_COOKIE,
  MAX_SAVED_ACCOUNTS,
} from "@/lib/account-switch/constants";
import { encodeSessionFromPayload } from "@/lib/account-switch/server";

const DEVICE_MAX_AGE = 60 * 60 * 24 * 400;
const useSecureCookies = process.env.NODE_ENV === "production";

export type ParkedAccountPublic = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  savedAt: number;
};

function deviceCookieOptions(maxAge = DEVICE_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: useSecureCookies,
    maxAge,
  };
}

export function newDeviceId() {
  return randomBytes(24).toString("hex");
}

export function readDeviceIdFromRequest(req?: NextRequest | null): string | null {
  const raw = req?.cookies.get(DEVICE_ACCOUNT_COOKIE)?.value?.trim();
  return raw && raw.length >= 16 ? raw : null;
}

export async function readDeviceIdFromJar(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(DEVICE_ACCOUNT_COOKIE)?.value?.trim();
  return raw && raw.length >= 16 ? raw : null;
}

export async function resolveDeviceId(req?: NextRequest | null): Promise<string> {
  return readDeviceIdFromRequest(req) ?? (await readDeviceIdFromJar()) ?? newDeviceId();
}

export function stampDeviceCookie(res: NextResponse, deviceId: string) {
  res.cookies.set(DEVICE_ACCOUNT_COOKIE, deviceId, deviceCookieOptions());
}

export function clearDeviceCookie(res: NextResponse) {
  res.cookies.set(DEVICE_ACCOUNT_COOKIE, "", deviceCookieOptions(0));
}

function isParkableIdentity(user: {
  username: string;
  role: string;
  email?: string | null;
  isBanned: boolean;
  deletedAt?: Date | null;
  accountStatus?: AccountStatus | null;
}) {
  if (user.deletedAt) return false;
  if (isServiceBanned(user)) return false;
  if (isOperatorIdentity(user)) return false;
  return true;
}

export async function parkUserOnDevice(deviceId: string, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isBanned: true,
      deletedAt: true,
      accountStatus: true,
    },
  });
  if (!user) return { ok: false as const, error: "USER_NOT_FOUND" };
  if (!isParkableIdentity(user)) return { ok: false as const, error: "NOT_PARKABLE" };

  await db.deviceParkedSession.upsert({
    where: { deviceId_userId: { deviceId, userId } },
    create: { deviceId, userId },
    update: { lastUsedAt: new Date() },
  });

  const extras = await db.deviceParkedSession.findMany({
    where: { deviceId },
    orderBy: { lastUsedAt: "desc" },
    skip: MAX_SAVED_ACCOUNTS,
    select: { id: true },
  });
  if (extras.length > 0) {
    await db.deviceParkedSession.deleteMany({
      where: { id: { in: extras.map((row) => row.id) } },
    });
  }

  return { ok: true as const };
}

export async function listParkedAccounts(deviceId: string): Promise<ParkedAccountPublic[]> {
  const rows = await db.deviceParkedSession.findMany({
    where: { deviceId },
    orderBy: { lastUsedAt: "desc" },
    take: MAX_SAVED_ACCOUNTS,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          email: true,
          role: true,
          isBanned: true,
          deletedAt: true,
          accountStatus: true,
        },
      },
    },
  });

  const dropIds: string[] = [];
  const accounts: ParkedAccountPublic[] = [];
  for (const row of rows) {
    if (!isParkableIdentity(row.user)) {
      dropIds.push(row.id);
      continue;
    }
    accounts.push({
      userId: row.user.id,
      username: row.user.username,
      name: row.user.name,
      image: displayableImageUrl(row.user.image),
      savedAt: row.lastUsedAt.getTime(),
    });
  }
  if (dropIds.length > 0) {
    await db.deviceParkedSession.deleteMany({ where: { id: { in: dropIds } } });
  }
  return accounts;
}

export async function unparkUserOnDevice(deviceId: string, userId: string) {
  await db.deviceParkedSession.deleteMany({ where: { deviceId, userId } });
}

export async function unparkAllOnDevice(deviceId: string) {
  await db.deviceParkedSession.deleteMany({ where: { deviceId } });
}

export async function nextParkedUserId(deviceId: string, exceptUserId?: string | null) {
  const accounts = await listParkedAccounts(deviceId);
  return accounts.find((a) => a.userId !== exceptUserId)?.userId ?? null;
}

export async function issueSessionForUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      email: true,
      role: true,
      premiumTier: true,
      locale: true,
      postTranslateInto: true,
      countryCode: true,
      timeZone: true,
      supportTierSent: true,
      earnedMocoTier: true,
      isBanned: true,
      accountStatus: true,
      deletedAt: true,
      adminDisabledAt: true,
    },
  });
  if (!user) return { ok: false as const, error: "USER_NOT_FOUND" };
  if (user.deletedAt) return { ok: false as const, error: "ACCOUNT_DELETED" };
  if (isServiceBanned(user)) return { ok: false as const, error: "BANNED" };
  if (isOperatorIdentity(user)) return { ok: false as const, error: "OPERATOR" };

  const identity = {
    username: user.username,
    role: user.role,
    email: user.email,
  };
  const isOperator = isOperatorIdentity(identity);
  const isStaff = isStaffIdentity(identity);

  const payload: Record<string, unknown> = {
    id: user.id,
    sub: user.id,
    username: user.username,
    name: user.name,
    picture: displayableImageUrl(user.image),
    email: user.email,
    role: effectiveRole(identity),
    premiumTier: user.premiumTier,
    locale: user.locale,
    postTranslateInto: user.postTranslateInto,
    countryCode: user.countryCode,
    timeZone: user.timeZone,
    supportTierSent: user.supportTierSent,
    earnedMocoTier: user.earnedMocoTier,
    isBanned: isServiceBanned(user),
    accountStatus: user.accountStatus,
    isSuspendedReadOnly: isSuspendedReadOnly(user),
    isDeleted: false,
    isOperator,
    isStaff: user.adminDisabledAt && !isOperator ? false : isStaff,
    profileSyncedAt: Date.now(),
  };

  const encoded = await encodeSessionFromPayload(payload);
  if (!encoded) return { ok: false as const, error: "ENCODE_FAILED" };
  return {
    ok: true as const,
    token: encoded,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: displayableImageUrl(user.image),
    },
  };
}

export async function activateParkedUser(deviceId: string, userId: string) {
  const parked = await db.deviceParkedSession.findUnique({
    where: { deviceId_userId: { deviceId, userId } },
    select: { userId: true },
  });
  if (!parked) return { ok: false as const, error: "NOT_PARKED" };

  const issued = await issueSessionForUser(userId);
  if (!issued.ok) {
    if (issued.error === "OPERATOR" || issued.error === "BANNED" || issued.error === "ACCOUNT_DELETED") {
      await unparkUserOnDevice(deviceId, userId);
    }
    return issued;
  }

  await db.deviceParkedSession.update({
    where: { deviceId_userId: { deviceId, userId } },
    data: { lastUsedAt: new Date() },
  });
  return issued;
}
