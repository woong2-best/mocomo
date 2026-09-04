import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { emailCodeSchema, sendMobileEmailAuthCode } from "@/lib/mobile-signup-auth";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-email-code", 20);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = emailCodeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const result = await sendMobileEmailAuthCode(parsed.data.email, parsed.data.mode);
  if ("error" in result && result.error) {
    const status = result.code === "EMAIL_NOT_REGISTERED" ? 404 : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json(result);
}
