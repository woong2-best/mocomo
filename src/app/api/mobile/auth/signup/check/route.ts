import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  checkSignupAvailability,
  checkUsernameAvailable,
  emailCodeSchema,
  registerBodySchema,
  registerMobileUser,
  resetCompleteSchema,
  sendMobileEmailAuthCode,
  verifyMobileSignupAndLogin,
  completeMobilePasswordReset,
  verifySignupSchema,
} from "@/lib/mobile-signup-auth";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-signup-check", 40);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const schema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(20),
    name: z.string().optional(),
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const availability = await checkSignupAvailability(
    parsed.data.email,
    parsed.data.username,
    parsed.data.name
  );
  if (!availability.ok) {
    return NextResponse.json({ ok: false, error: availability.error }, { status: 409 });
  }

  const usernameCheck = await checkUsernameAvailable(parsed.data.username);
  if (!usernameCheck.available) {
    return NextResponse.json(
      { ok: false, error: usernameCheck.error ?? "사용할 수 없는 닉네임입니다." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    canResume: availability.canResume,
    message: availability.message,
  });
}
