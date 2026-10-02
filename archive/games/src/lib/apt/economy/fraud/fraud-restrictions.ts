import { headers } from "next/headers";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getRequestIp } from "@/lib/request-ip";
import { getEconomyConfigFull } from "../config-service";

export type FraudRestriction = {
  blocked: boolean;
  reason?: string;
  level?: "restrict" | "market" | "live" | "freeze";
};

async function getProfile(userId: string) {
  return db.aptFraudProfile.findUnique({ where: { userId } });
}

export async function checkFraudRestrictions(
  userId: string,
  area: "trade" | "market" | "live" | "shop"
): Promise<FraudRestriction> {
  const profile = await getProfile(userId);
  if (!profile) return { blocked: false };

  if (profile.whitelistedUntil && profile.whitelistedUntil > new Date()) {
    return { blocked: false };
  }

  if (profile.frozenAt) {
    return { blocked: true, reason: "계정이 동결되었습니다.", level: "freeze" };
  }

  const config = await getEconomyConfigFull();
  const score = profile.riskScore;

  if (score >= config.fraudLiveBlockScore && area === "live") {
    return {
      blocked: true,
      reason: "라이브 보상이 제한된 계정입니다.",
      level: "live",
    };
  }

  if (score >= config.fraudMarketBlockScore && (area === "market" || area === "shop")) {
    return {
      blocked: true,
      reason: "장터·상점 이용이 제한된 계정입니다.",
      level: "market",
    };
  }

  if (score >= config.fraudRestrictScore && area !== "live") {
    return {
      blocked: true,
      reason: "거래가 제한된 계정입니다. 고객센터에 문의하세요.",
      level: "restrict",
    };
  }

  return { blocked: false };
}

export async function assertFraudAllowed(
  userId: string,
  area: "trade" | "market" | "live" | "shop"
): Promise<void> {
  const res = await checkFraudRestrictions(userId, area);
  if (res.blocked) throw new Error(res.reason ?? "이용이 제한되었습니다.");
}

/** 기기/IP 기록 — 로그인·API 호출 시 */
export async function recordUserDevice(input: {
  userId: string;
  fingerprint: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  if (!input.fingerprint) return;
  await db.aptUserDevice.upsert({
    where: {
      userId_fingerprint: { userId: input.userId, fingerprint: input.fingerprint },
    },
    create: {
      userId: input.userId,
      fingerprint: input.fingerprint,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
    update: {
      lastSeenAt: new Date(),
      ip: input.ip ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });
}

/** 로그인·OAuth 성공 시 IP/UA(또는 x-device-fp) 기록 */
export async function recordUserDeviceFromRequest(userId: string): Promise<void> {
  const h = await headers();
  const ip = await getRequestIp();
  const explicit = h.get("x-device-fp")?.trim();
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;
  const fingerprint =
    explicit ||
    createHash("sha256")
      .update(`${ip}|${userAgent ?? ""}`)
      .digest("hex")
      .slice(0, 32);

  await recordUserDevice({ userId, fingerprint, ip, userAgent });
}
