import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isFcmConfigured } from "@/lib/fcm-push";
import { isWebPushConfigured } from "@/lib/web-push";
import { resolveSocketUrl } from "@/lib/socket-url";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { guardSensitiveHealthEndpoint } from "@/lib/api-security";

export async function GET(req: NextRequest) {
  const denied = guardSensitiveHealthEndpoint(req);
  if (denied) return denied;

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (e) {
    checks.database = { ok: false, detail: e instanceof Error ? e.message : "error" };
  }

  checks.webPush = { ok: isWebPushConfigured() };
  checks.fcm = { ok: isFcmConfigured() };
  checks.socketUrl = { ok: !!resolveSocketUrl(), detail: resolveSocketUrl() || "unset" };
  checks.live = { ok: isLiveFeatureEnabled() };

  const criticalOk = checks.database.ok;
  const status = criticalOk ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      service: "mocomo",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: criticalOk ? 200 : 503 }
  );
}
