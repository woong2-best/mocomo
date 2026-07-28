import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  revokeAllMobileRefreshTokens,
  revokeMobileRefreshToken,
} from "@/lib/mobile-auth-tokens";
import { getMobileUserId } from "@/lib/api-mobile-auth";

const bodySchema = z.object({
  refreshToken: z.string().min(20).max(512).optional(),
  allDevices: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-logout", 30);
  if (limited) return limited;

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    json = {};
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (parsed.data.allDevices) {
    const userId = await getMobileUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    await revokeAllMobileRefreshTokens(userId);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.refreshToken) {
    await revokeMobileRefreshToken(parsed.data.refreshToken);
  }

  return NextResponse.json({ ok: true });
}
