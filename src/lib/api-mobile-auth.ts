import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AccountStatus, PremiumTier } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ACCOUNT_SUSPENDED_WRITE_MESSAGE,
  assertAccountCanWrite,
  isServiceBanned,
  type AccountWriteKind,
} from "@/lib/account-status";
import { verifyMobileAccessToken } from "@/lib/mobile-auth-tokens";

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  premiumTier: true,
  isBanned: true,
  accountStatus: true,
  deletedAt: true,
} as const;

type GateUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  premiumTier: PremiumTier;
  isBanned: boolean;
  accountStatus: AccountStatus;
  deletedAt: Date | null;
};

/** Short TTL so chat sync / inbox don't pay a DB round-trip every poll. */
const USER_GATE_TTL_MS = 8_000;
const userGateCache = new Map<string, { at: number; user: GateUser | null }>();

function getCachedGateUser(userId: string): GateUser | null | undefined {
  const hit = userGateCache.get(userId);
  if (!hit) return undefined;
  if (Date.now() - hit.at > USER_GATE_TTL_MS) {
    userGateCache.delete(userId);
    return undefined;
  }
  return hit.user;
}

function setCachedGateUser(userId: string, user: GateUser | null) {
  if (userGateCache.size > 5_000) userGateCache.clear();
  userGateCache.set(userId, { at: Date.now(), user });
}

export function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export async function getMobileUserId(req: NextRequest): Promise<string | null> {
  const raw = extractBearerToken(req);
  if (!raw) return null;
  const claims = await verifyMobileAccessToken(raw);
  return claims?.sub ?? null;
}

/**
 * Bearer-only auth for `/api/mobile/*`. Parallel to cookie `requireApiUser`.
 */
export async function requireMobileApiUser(
  req: NextRequest,
  options?: { writeKind?: AccountWriteKind }
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  let user = getCachedGateUser(userId);
  if (user === undefined) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    setCachedGateUser(userId, user);
  }

  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  if (isServiceBanned(user)) {
    return { error: NextResponse.json({ error: "이용이 제한된 계정입니다." }, { status: 403 }) };
  }
  if (user.deletedAt) {
    return { error: NextResponse.json({ error: "탈퇴한 계정입니다." }, { status: 403 }) };
  }
  try {
    assertAccountCanWrite(user, options?.writeKind ?? "default");
  } catch {
    return {
      error: NextResponse.json(
        { error: ACCOUNT_SUSPENDED_WRITE_MESSAGE, code: "ACCOUNT_SUSPENDED" },
        { status: 403 }
      ),
    };
  }
  return { user };
}
