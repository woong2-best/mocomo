import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminHash, adminRandomToken } from "@/lib/admin/security/crypto";
import {
  ADMIN_TRUSTED_COOKIE,
  ADMIN_TRUSTED_TTL_SEC,
  adminSecurityCookieOptions,
} from "@/lib/admin/security/session-cookie";

/** OWNER / SUPER_ADMIN — Trusted Device로 Passkey+TOTP 생략 불가 */
export function roleRequiresAlwaysMfa(role: string): boolean {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

export async function issueTrustedDevice(
  userId: string,
  meta?: { label?: string; userAgent?: string | null; ip?: string | null }
) {
  const token = adminRandomToken(32);
  const tokenHash = adminHash(token);
  const expiresAt = new Date(Date.now() + ADMIN_TRUSTED_TTL_SEC * 1000);
  await db.adminTrustedDevice.create({
    data: {
      userId,
      tokenHash,
      label: meta?.label ?? "Trusted device",
      userAgent: meta?.userAgent?.slice(0, 500) ?? null,
      ip: meta?.ip ?? null,
      expiresAt,
    },
  });
  const jar = await cookies();
  jar.set(ADMIN_TRUSTED_COOKIE, `${userId}.${token}`, {
    ...adminSecurityCookieOptions(ADMIN_TRUSTED_TTL_SEC),
  });
  return { expiresAt };
}

export async function clearTrustedDeviceCookie() {
  const jar = await cookies();
  jar.set(ADMIN_TRUSTED_COOKIE, "", {
    ...adminSecurityCookieOptions(0),
    maxAge: 0,
  });
}

export async function verifyTrustedDeviceCookie(
  userId: string,
  role: string
): Promise<boolean> {
  if (roleRequiresAlwaysMfa(role)) return false;
  const jar = await cookies();
  const raw = jar.get(ADMIN_TRUSTED_COOKIE)?.value;
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const cookieUserId = raw.slice(0, dot);
  const token = raw.slice(dot + 1);
  if (cookieUserId !== userId || !token) return false;
  const tokenHash = adminHash(token);
  const row = await db.adminTrustedDevice.findFirst({
    where: {
      userId,
      tokenHash,
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) return false;
  await db.adminTrustedDevice.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  return true;
}

export async function listTrustedDevices(userId: string) {
  return db.adminTrustedDevice.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      userAgent: true,
      ip: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function revokeTrustedDevice(userId: string, deviceId: string) {
  await db.adminTrustedDevice.deleteMany({ where: { id: deviceId, userId } });
}
