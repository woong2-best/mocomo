import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  rotateMobileRefreshToken,
  signMobileAccessToken,
} from "@/lib/mobile-auth-tokens";

const bodySchema = z.object({
  refreshToken: z.string().min(20).max(512),
  deviceId: z.string().max(128).optional(),
  platform: z.enum(["android", "ios"]).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-refresh", 60);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "refreshToken이 필요합니다." }, { status: 400 });
  }

  const rotated = await rotateMobileRefreshToken(parsed.data.refreshToken, {
    deviceId: parsed.data.deviceId,
    platform: parsed.data.platform,
  });
  if (!rotated) {
    return NextResponse.json({ error: "세션이 만료되었습니다.", code: "invalid_refresh" }, { status: 401 });
  }

  const accessToken = await signMobileAccessToken(rotated.userId);
  return NextResponse.json({
    accessToken,
    refreshToken: rotated.refreshToken,
    expiresAt: rotated.expiresAt.toISOString(),
  });
}
