import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkRateLimit, apiLimiter } from "@/lib/ratelimit";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { verifyApiOrigin } from "@/lib/api-origin";

export { verifyApiOrigin, shouldGuardMutatingApiOrigin, MUTATING_API_ORIGIN_EXEMPT_PREFIXES } from "@/lib/api-origin";

export function getClientIpFromRequest(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** 공개 API 남용 방지 — Upstash 없으면 DB 폴백 */
export async function rateLimitPublicApi(
  req: NextRequest,
  bucket: string,
  maxPerMinute = 40
): Promise<NextResponse | null> {
  const ip = getClientIpFromRequest(req);
  const key = `${bucket}:${ip}`;

  if (apiLimiter) {
    const { success } = await checkRateLimit(apiLimiter, key);
    if (!success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }
    return null;
  }

  const minuteKey = new Date().toISOString().slice(0, 16);
  const identifier = `rate:api:${bucket}:${ip}:${minuteKey}`;
  const count = await db.verificationToken.count({
    where: { identifier, expires: { gt: new Date() } },
  });
  if (count >= maxPerMinute) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }
  await db.verificationToken.create({
    data: {
      identifier,
      token: `hit-${Date.now()}-${randomBytes(3).toString("hex")}`,
      expires: new Date(Date.now() + 65_000),
    },
  });
  return null;
}

export async function checkUploadRateLimit(userId: string): Promise<NextResponse | null> {
  const minuteKey = new Date().toISOString().slice(0, 16);
  const identifier = `rate:upload:${userId}:${minuteKey}`;
  const count = await db.verificationToken.count({
    where: { identifier, expires: { gt: new Date() } },
  });
  if (count >= 20) {
    return NextResponse.json({ error: "업로드 요청이 너무 많습니다." }, { status: 429 });
  }
  await db.verificationToken.create({
    data: {
      identifier,
      token: `up-${Date.now()}-${randomBytes(3).toString("hex")}`,
      expires: new Date(Date.now() + 65_000),
    },
  });
  return null;
}

/** 운영/배포 전용 — CRON_SECRET 또는 PLATFORM_BOOTSTRAP_SECRET */
export function verifyInternalSecret(req: NextRequest): boolean {
  const secret =
    process.env.CRON_SECRET?.trim() || process.env.PLATFORM_BOOTSTRAP_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const header = req.headers.get("x-mocomo-cron-secret");
  return header === secret;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

/** 프로덕션 상세 health·진단 API — CRON_SECRET 없으면 403 */
export function guardSensitiveHealthEndpoint(req: NextRequest): NextResponse | null {
  if (!isProduction()) return null;
  if (verifyInternalSecret(req)) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** 인증된 변경 API — Origin 검증 + 선택적 rate limit */
export async function guardMutatingApi(
  req: NextRequest,
  options?: { rateBucket?: string; maxPerMinute?: number }
): Promise<NextResponse | null> {
  if (!verifyApiOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (options?.rateBucket) {
    return rateLimitPublicApi(req, options.rateBucket, options.maxPerMinute ?? 60);
  }
  return null;
}
