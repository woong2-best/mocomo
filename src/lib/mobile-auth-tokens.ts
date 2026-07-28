import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const ACCESS_TYP = "mocomo-mobile-access";
const ACCESS_TTL = "1h";
const REFRESH_DAYS = 30;

function mobileJwtSecret(): Uint8Array {
  const raw =
    process.env.MOBILE_JWT_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "";
  if (!raw || raw.length < 16) {
    throw new Error("MOBILE_JWT_SECRET or AUTH_SECRET must be set for mobile auth");
  }
  return new TextEncoder().encode(`mobile-access:${raw}`);
}

export type MobileAccessClaims = {
  sub: string;
  typ: typeof ACCESS_TYP;
};

export async function signMobileAccessToken(userId: string): Promise<string> {
  return new SignJWT({ typ: ACCESS_TYP })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(mobileJwtSecret());
}

export async function verifyMobileAccessToken(
  token: string
): Promise<MobileAccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, mobileJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.typ !== ACCESS_TYP || typeof payload.sub !== "string" || !payload.sub) {
      return null;
    }
    return { sub: payload.sub, typ: ACCESS_TYP };
  } catch {
    return null;
  }
}

function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function newOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export type IssueRefreshOptions = {
  userId: string;
  deviceId?: string | null;
  platform?: string | null;
};

export async function issueMobileRefreshToken(
  opts: IssueRefreshOptions
): Promise<{ refreshToken: string; expiresAt: Date }> {
  const refreshToken = newOpaqueToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await db.mobileRefreshToken.create({
    data: {
      userId: opts.userId,
      tokenHash,
      deviceId: opts.deviceId ?? null,
      platform: opts.platform ?? null,
      expiresAt,
    },
  });

  return { refreshToken, expiresAt };
}

export async function rotateMobileRefreshToken(
  rawRefresh: string,
  opts?: { deviceId?: string | null; platform?: string | null }
): Promise<{ userId: string; refreshToken: string; expiresAt: Date } | null> {
  const tokenHash = hashRefreshToken(rawRefresh);
  const existing = await db.mobileRefreshToken.findUnique({
    where: { tokenHash },
  });
  if (!existing || existing.revokedAt || existing.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const refreshToken = newOpaqueToken();
  const newHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    const created = await tx.mobileRefreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: newHash,
        deviceId: opts?.deviceId ?? existing.deviceId,
        platform: opts?.platform ?? existing.platform,
        expiresAt,
      },
    });
    await tx.mobileRefreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        replacedById: created.id,
        lastUsedAt: new Date(),
      },
    });
  });

  return { userId: existing.userId, refreshToken, expiresAt };
}

export async function revokeMobileRefreshToken(rawRefresh: string): Promise<boolean> {
  const tokenHash = hashRefreshToken(rawRefresh);
  const res = await db.mobileRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count > 0;
}

export async function revokeAllMobileRefreshTokens(userId: string): Promise<number> {
  const res = await db.mobileRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

export async function issueMobileTokenPair(opts: IssueRefreshOptions): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const accessToken = await signMobileAccessToken(opts.userId);
  const refresh = await issueMobileRefreshToken(opts);
  return {
    accessToken,
    refreshToken: refresh.refreshToken,
    expiresAt: refresh.expiresAt,
  };
}
